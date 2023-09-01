import { parse } from 'querystring';
import { blocks, modal, slackApi, verifySlackRequest } from './util/slack';
import { saveItem } from './util/notion';

async function handleSlashCommand(payload: SlackSlashCommandPayload) {
  switch (payload.command) {
    case '/foodfight':
      const response = await slackApi(
        'views.open',
        modal({
          id: 'foodfight-modal',
          title: 'Start a food fight',
          trigger_id: payload.trigger_id,
          blocks: [
            blocks.section({
              text: 'demands food drama!',
            }),
            //@ts-ignore
            blocks.input({
              id: 'opinion',
              label: 'Deposit your controversial food options here',
              placeholder: 'Example: diary products are hell!',
              initial_value: payload.text ?? '',
              hint: 'What do you believe about food that people find appaling??',
            }),
            blocks.select({
              id: 'spice_level',
              label: 'How spicy is this opinion?',
              placeholder: 'Select a spice level',
              options: [
                {
                  label: 'mild',
                  value: 'mild',
                },
                {
                  label: 'medium',
                  value: 'medium',
                },
                {
                  label: 'spicy',
                  value: 'spicy',
                },
                {
                  label: 'nuclear',
                  value: 'nuclear',
                },
              ],
            }),
          ],
        })
      );

      if (!response.ok) {
        console.error('Slack API Error:', response);
        return {
          statusCode: 500,
          body: 'Failed to send message to Slack',
        };
      }
      break;
    default:
      return {
        statusCode: 200,
        body: `Command ${payload.command} is not recognized`,
      };
  }

  return {
    statusCode: 200,
    body: '',
  };
}

async function handleInterativity(payload: SlackModalPayload) {
  const callback_id = payload.callback_id ?? payload.view.callback_id;

  switch (callback_id) {
    case 'foodfight-modal':
      const data = payload.view.state.values;
      const fields = {
        opinion: data.opinion_block.opinion.value,
        spiceLevel: data.spice_level_block.spice_level.selected_option.value,
        submitter: payload.user.name,
      };

      await saveItem(fields);

      await slackApi('chat.postMessage', {
        channel: 'C05R9CFCM8Q',
        text: `Oh dang, y'all :eyes: <@${payload.user.id}> just started food fight with ad ${fields.spiceLevel} take:\n\n*${fields.opinion}*\n...discuss.`,
      });
      break;

    case 'start-food-fight-nudge':
      const channel = payload.channel?.id;
      const user_id = payload.user.id;
      const thread_ts = payload.message.thread_ts ?? payload.message.ts;

      await slackApi('chat.postMessage', {
        channel,
        thread_ts,
        text: `Hey <@${user_id}>, an opinion like this one deserves a heated public debat. RUn the \`/foodfight\` slash command in a main channel to start one!`,
      });
      break;

    default:
      console.log(`No handler defined for ${callback_id}`);
      return {
        statusCode: 400,
        body: `No handler defined for ${callback_id}`,
      };
  }

  return {
    statusCode: 200,
    body: '',
  };
}

export const handler = async (event) => {
  const valid = verifySlackRequest(event);
  if (!valid) {
    console.error('invalid request');

    return {
      statusCode: 400,
      body: 'invalid request',
    };
  }
  const body = parse(event.body ?? '') as SlackPayload;

  if (body.command) {
    return handleSlashCommand(body as SlackSlashCommandPayload);
  }

  if (body.payload) {
    const payload = JSON.parse(body.payload);
    return handleInterativity(payload);
  }

  return {
    statusCode: 200,
    body: 'TODO: handle Slack commands and interactivity',
  };
};
