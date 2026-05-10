import { Injectable } from '@nestjs/common';

interface RiskFactors {
    amount: number;
    currency: string;
    sourceUserId: string;
    destinationIban: string;
    isInternalTransfer: boolean;
}

@Injectable()
export class RiskService {
    /**
     * Simulated fraud scoring engine.
     * Returns a score from 0 to 100:
     *   0-49: Low risk (auto-approve)
     *   50-79: Medium risk (flagged as suspicious)
     *   80-100: High risk (auto-reject)
     */
    evaluateRisk(factors: RiskFactors): {
        score: number;
        reasons: string[];
    } {
        let score = 0;
        const reasons: string[] = [];

        // Factor 1: Amount thresholds
        if (factors.amount > 50000) {
            score += 40;
            reasons.push('Very high transaction amount (> 50,000)');
        } else if (factors.amount > 10000) {
            score += 25;
            reasons.push('High transaction amount (> 10,000)');
        } else if (factors.amount > 5000) {
            score += 10;
            reasons.push('Moderate transaction amount (> 5,000)');
        }

        // Factor 2: Cross-currency transfer
        if (factors.currency !== 'RON') {
            score += 15;
            reasons.push('Cross-currency transaction');
        }

        // Factor 3: External transfer (non-internal)
        if (!factors.isInternalTransfer) {
            score += 10;
            reasons.push('External transfer to third-party');
        }

        // Factor 4: Time-based risk (late night transactions)
        const currentHour = new Date().getHours();
        if (currentHour >= 0 && currentHour < 6) {
            score += 15;
            reasons.push('Transaction initiated during unusual hours (00:00-06:00)');
        }

        // Factor 5: Simulated random noise (represents ML model uncertainty)
        const noise = Math.floor(Math.random() * 10);
        score += noise;

        // Cap at 100
        score = Math.min(score, 100);

        return { score, reasons };
    }

    getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (score >= 80) return 'HIGH';
        if (score >= 50) return 'MEDIUM';
        return 'LOW';
    }
}
