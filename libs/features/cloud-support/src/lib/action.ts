import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getUserIdentity } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

// TODO: Error handling, Pending UI
export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
  const { env } = context.cloudflare;

  const body = await request.formData();
  const accountId = body.get('accountId');
  const environmentId = body.get('environmentId');
  const issue = body.get('issue');
  const description = body.get('description');
  const access_token = body.get('access_token');
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  invariant(issue, 'Missing issue param');
  invariant(description, 'Missing description param');
  invariant(access_token, 'Missing access_token param');

  const response = await getUserIdentity({
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (response.data?.userId && process.env.SLACK_API_URL) {
    const slackResponse = await fetch(process.env.SLACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${env.SLACK_TOKEN}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        channel: 'cloud-support',
        attachments: [
          {
            color: '#222452',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*Support ticket*',
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: description,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `*User:* ${response.data?.userId}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Account:* ${accountId}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Environment:* ${environmentId}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Issue:* ${issue}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });
    const res: any = await slackResponse.json();
    if (res?.ok) {
      return json({ ok: true });
    }
  }

  return json({ errors: ['Fail to create ticket'], ok: false });
};
