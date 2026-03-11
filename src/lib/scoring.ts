import type { Listing, DealEvaluation, DealScore, ConfidenceScore } from '../data/types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function generateFlagReason(
  dealScore: DealScore,
  pctBelow: number,
  confidence: ConfidenceScore
): string {
  if (dealScore === 'Strong') {
    if (confidence === 'High') return 'Priced well below similar live listings';
    return 'Lower total price than most comparable listings, including shipping';
  }
  if (dealScore === 'Good') {
    if (pctBelow > 0.15) return 'Strong price relative to similar condition listings';
    return 'Below the typical price range for this item';
  }
  if (dealScore === 'Possible') {
    return 'Could be a deal, but listing details are limited';
  }
  return '';
}

export function computeDealScore(
  listing: Listing,
  comparables: Listing[],
  groupId: string
): DealEvaluation {
  const prices = comparables.map(c => c.totalPrice);
  const med = median(prices);
  const pctBelow = med > 0 ? (med - listing.totalPrice) / med : 0;

  const confidence: ConfidenceScore =
    comparables.length >= 5 ? 'High' : comparables.length >= 3 ? 'Medium' : 'Low';

  let dealScore: DealScore;
  if (pctBelow > 0.2 && confidence !== 'Low') dealScore = 'Strong';
  else if (pctBelow > 0.1 && confidence !== 'Low') dealScore = 'Good';
  else if (pctBelow > 0.05) dealScore = 'Possible';
  else dealScore = 'None';

  return {
    id: `eval_${listing.id}`,
    listingId: listing.id,
    comparableGroupId: groupId,
    dealScore,
    confidenceScore: confidence,
    estimatedSavings: Math.max(0, med - listing.totalPrice),
    flagReason: generateFlagReason(dealScore, pctBelow, confidence),
    flagged: dealScore !== 'None',
  };
}
