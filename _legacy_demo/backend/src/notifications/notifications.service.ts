import { Injectable } from '@nestjs/common';

export type NotificationType =
    | 'LOGIN'
    | 'TRANSFER'
    | 'CARD_BLOCKED'
    | 'SECURITY_ALERT'
    | 'MFA_ENABLED';

@Injectable()
export class NotificationsService {
    /**
     * Mock notification service.
     * In production, this would send emails, SMS, or push notifications.
     */
    async notify(
        userId: string,
        type: NotificationType,
        payload: Record<string, any>,
    ) {
        const timestamp = new Date().toISOString();

        console.log('═══════════════════════════════════════════════');
        console.log(`📧 NOTIFICATION [${type}]`);
        console.log(`   User: ${userId}`);
        console.log(`   Time: ${timestamp}`);
        console.log(`   Payload:`, JSON.stringify(payload, null, 2));
        console.log('═══════════════════════════════════════════════');

        // In production: send email via SendGrid, Nodemailer, etc.
        return {
            sent: true,
            type,
            userId,
            timestamp,
        };
    }
}
