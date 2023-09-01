import { type Handler, schedule } from '@netlify/functions';
import { getNewItems } from './util/notion';
import { blocks, slackApi } from './util/slack';

const postnewNotionItemsToSlack: Handler = async () => {
  const items = await getNewItems();

  console.log('Here are items===', items);

  await slackApi('chat.postMessage', {
    channel: 'C05QYAJGB17',
    blocks: [
      blocks.section({
        text: [
          'Here are the opinions awaiting judgment:',
          '',
          ...items.map(
            (item) => `- ${item.Opinion} (spice level: ${item.spiceLevel})`
          ),
          '',
          `See all items <https://notion.com/${process.env.NOTION_DATABASE_ID}|in Notion>.`,
        ].join('\n'),
      }),
    ],
  });

  return {
    statusCode: 200,
  };
};

export const handler = schedule('* * * * *', postnewNotionItemsToSlack);
