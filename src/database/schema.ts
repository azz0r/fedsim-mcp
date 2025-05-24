// Ported from Fed Simulator X database schema
export const version = 14;
export const name = `FedSim000${version}`;

const lightStandard = '++id, name';
const basicFields = `${lightStandard}, desc, image`;
const standardFields = `${basicFields}, color, backgroundColor`;

export const Groups = [
  {
    group: 'Venue',
    params: `${standardFields}, images, capacity, location, cost, revenueMultiplier, timeZone, setupTimeInDays, historicalRating, pyroRating, lightingRating, parkingRating`,
  },
  {
    group: 'Company',
    params: standardFields,
  },
  {
    group: 'Brand',
    params: `${standardFields}, images, directorId, balance, companyId`,
  },
  {
    group: 'Wrestler',
    params: `${standardFields}, images, brandIds, entranceVideoUrl, pushed, remainingAppearances, contractType, contractExpires, status, billedFrom, region, country, dob, height, weight, alignment, gender, role, followers, losses, wins, streak, draws, points, morale, stamina, popularity, charisma, damage, active, retired, cost, special, finisher, musicUrl`,
  },
  {
    group: 'Championship',
    params: `${standardFields}, images, wrestlerIds, brandIds, gender, holders, minPoints, maxPoints, rank, active`,
  },
  {
    group: 'Show',
    params: `${standardFields}, images, brandIds, commentatorIds, refereeIds, interviewerIds, authorityIds, special, frequency, monthIndex, weekIndex, dayIndex, maxDuration, entranceVideoUrl, minPoints, maxPoints, income, defaultAmountSegments, avgTicketPrice, avgMerchPrice, avgViewers, avgAttendance`,
  },
  {
    group: 'Bet',
    params: '++id, segmentId, wrestlerId, amount, type, complete, date',
  },
  {
    group: 'Production',
    params: `${standardFields}, brandIds, venueId, segmentIds, showId, date, wrestlersCost, segmentsCost, merchIncome, attendanceIncome, attendance, viewers, step, complete`,
  },
  {
    group: 'Segment',
    params: `${lightStandard}, championshipIds, appearanceIds, date, type, duration, rating, complete`,
  },
  {
    group: 'Appearance',
    params: '++id, wrestlerId, groupId, manager, cost, winner, loser, draw, [groupId+wrestlerId]',
  },
  {
    group: 'Faction',
    params: `${standardFields}, images, brandIds, leaderIds, managerIds, wrestlerIds, startDate, endDate`,
  },
  {
    group: 'Draft',
    params: '++id, startDate, endDate, contractType, amountOfAppearances, costPerAppearance, pick, complete, brandId, wrestlerId',
  },
  {
    group: 'Game',
    params: '++id, brandIds, gender, tutorials, storeVersion, desc, color, backgroundColor, date, dark',
  },
  {
    group: 'StorylineTemplate',
    params: '++id, name, description, category, minDuration, maxDuration, roles, requirements, segments, active',
  },
  {
    group: 'ActiveStoryline',
    params: '++id, templateId, name, description, targetEventId, startDate, targetDate, status, participants, currentWeek, totalWeeks, completedSegments, nextSegment, intensity, peakIntensity',
  },
  {
    group: 'StorylineSegment',
    params: '++id, storylineId, segmentId, weekNumber, segmentType, impact, description, completed, completedDate',
  },
  {
    group: 'StorylineGoal',
    params: '++id, storylineId, participantRole, goalType, target, status, completedDate, reward',
  },
  {
    group: 'Reign',
    params: '++id, wrestlerIds, championshipId, defenses, startDate, endDate',
  },
  {
    group: 'Rumble',
    params: `${standardFields}, date, championshipId, entryIds, enteredIds, eliminationIds, eliminatedByIds, winnerId, gender, brandIds, duration, active, complete`,
  },
  {
    group: 'Favourite',
    params: '++id, itemId, itemGroup, dateFavourited',
  },
  {
    group: 'Notification',
    params: '++id, title, message, type, severity, icon, createdAt, readAt, dismissedAt, autoHideDuration, persistent, metadata',
  },
];

export const stores = Groups.reduce((acc, group) => {
  acc[group.group] = group.params;
  return acc;
}, {} as Record<string, string>);