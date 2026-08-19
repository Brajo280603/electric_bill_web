import webpush from 'web-push';
import PocketBase from 'pocketbase';
import { VAPID_PRIVATE_KEY } from '$env/static/private';
import { PUBLIC_VAPID_KEY } from '$env/static/public';

const pbPath = 'https://kharcha-pani.pockethost.io';

export async function GET({ request }) {
    // Vercel Cron will send a secret header or simply rely on security. 
    // In production, we should verify the request came from Vercel via process.env.CRON_SECRET

    const pb = new PocketBase(pbPath);

    try {
        // 1. Get the latest electric bill record
        const records = await pb.collection('electric_bills').getList(1, 1, {
            sort: '-created',
        });

        if (records.items.length === 0) {
            return new Response('No records found to send.', { status: 200 });
        }

        const latestRecord = records.items[0];
        const payloadJson = latestRecord.json_output || {};
        const availableBalance = payloadJson.AVAILABLE_BALANCE || '---';
        const rechargeAmount = payloadJson.RECHARGE_AMOUNT || '0';

        // 2. Prepare the Notification Body
        const notificationPayload = {
            title: "Daily Electricity Update",
            body: `Balance: ₹${availableBalance} | Last Recharge: ₹${rechargeAmount}`,
        };

        // 3. Fetch all web push subscriptions
        const subscriptions = await pb.collection('push_subscriptions').getFullList();

        if (subscriptions.length === 0) {
            return new Response('No subscriptions found.', { status: 200 });
        }

        // 4. Configure web-push with VAPID keys
        webpush.setVapidDetails(
            'mailto:your-email@example.com',
            PUBLIC_VAPID_KEY,
            VAPID_PRIVATE_KEY
        );

        // 5. Send Notifications
        let successCount = 0;
        let failCount = 0;

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
                successCount++;
            } catch (err) {
                console.error('Failed to send to a subscriber:', err);
                // If status is 410 (Gone), the user unsubscribed.
                if (err.statusCode === 410) {
                    await pb.collection('push_subscriptions').delete(sub.id);
                }
                failCount++;
            }
        }

        return new Response(`Sent: ${successCount}, Failed: ${failCount}`, { status: 200 });
    } catch (error) {
        console.error('Cron Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
