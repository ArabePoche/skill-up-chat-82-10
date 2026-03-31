export const slugifySolidarityCampaign = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'cagnotte';

export const buildSolidarityCampaignPath = (campaignId: string, title: string) =>
  `/solidarity/${campaignId}/${slugifySolidarityCampaign(title)}`;