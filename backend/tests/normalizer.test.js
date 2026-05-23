'use strict';

const { fromApiFootball, fromSportsDB, fromFootballData } = require('../normalizer');


describe('Normalizer Engine', () => {
  test('should normalize API-Football fixture details correctly', () => {
    const apiFootballMock = {
      fixture: {
        id: 1035092,
        referee: 'Michael Oliver',
        timezone: 'UTC',
        date: '2026-05-20T19:45:00+00:00',
        timestamp: 1779315900,
        periods: { first: null, second: null },
        venue: { id: 550, name: 'Old Trafford', city: 'Manchester' },
        status: { long: 'Not Started', short: 'NS', elapsed: 0 }
      },
      league: {
        id: 39,
        name: 'Premier League',
        country: 'England',
        logo: 'https://media.api-sports.io/football/leagues/39.png',
        flag: 'https://media.api-sports.io/flags/gb.svg',
        season: 2025,
        round: 'Regular Season - 37'
      },
      teams: {
        home: {
          id: 33,
          name: 'Manchester United',
          logo: 'https://media.api-sports.io/football/teams/33.png',
          winner: null
        },
        away: {
          id: 40,
          name: 'Liverpool',
          logo: 'https://media.api-sports.io/football/teams/40.png',
          winner: null
        }
      },
      goals: { home: null, away: null },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home: null, away: null },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null }
      },
      events: [
        {
          time: { elapsed: 15, extra: null },
          team: { id: 33, name: 'Manchester United', logo: 'https://media.api-sports.io/football/teams/33.png' },
          player: { id: 909, name: 'Marcus Rashford' },
          assist: { id: 912, name: 'Bruno Fernandes' },
          type: 'Goal',
          detail: 'Normal Goal',
          comments: null
        }
      ]
    };

    const normalized = fromApiFootball(apiFootballMock);

    expect(normalized.external_id).toBe('1035092');
    expect(normalized.home_team).toBe('Manchester United');
    expect(normalized.away_team).toBe('Liverpool');
    expect(normalized.home_score).toBe(0); // null default to 0
    expect(normalized.status).toBe('NS');
    expect(normalized.venue).toBe('Old Trafford');
    expect(normalized.referee).toBe('Michael Oliver');
    expect(normalized.source).toBe('api_football');
    
    // Check events normalization
    expect(normalized.events.length).toBe(1);
    expect(normalized.events[0].player).toBe('Marcus Rashford');
    expect(normalized.events[0].type).toBe('goal');
    expect(normalized.events[0].team_side).toBe('home');
    expect(normalized.events[0].minute).toBe(15);
  });

  test('should normalize TheSportsDB live event correctly', () => {
    const sdbMock = {
      idEvent: '1413894',
      strHomeTeam: 'Real Madrid',
      strAwayTeam: 'Barcelona',
      intHomeScore: '2',
      intAwayScore: '1',
      strStatus: 'In Progress',
      intProgress: '75',
      strLeague: 'La Liga',
      strTimestamp: '2026-05-20T21:00:00+00:00',
      strVenue: 'Santiago Bernabeu',
      idLeague: '4335',
      idHomeTeam: '133759',
      idAwayTeam: '133758'
    };

    const normalized = fromSportsDB(sdbMock);

    expect(normalized.external_id).toBe('1413894');
    expect(normalized.home_team).toBe('Real Madrid');
    expect(normalized.away_team).toBe('Barcelona');
    expect(normalized.home_score).toBe(2);
    expect(normalized.away_score).toBe(1);
    expect(normalized.status).toBe('LIVE');
    expect(normalized.minute).toBe(75);
    expect(normalized.league).toBe('La Liga');
    expect(normalized.source).toBe('sportsdb');
  });

  test('should normalize football-data.org fixtures correctly', () => {
    const fdMock = {
      id: 435987,
      utcDate: '2026-05-20T19:00:00Z',
      status: 'IN_PLAY',
      homeTeam: {
        id: 65,
        name: 'Barcelona',
        shortName: 'Barca',
        crest: 'https://crests.football-data.org/65.png'
      },
      awayTeam: {
        id: 78,
        name: 'Real Madrid',
        shortName: 'Real Madrid',
        crest: 'https://crests.football-data.org/78.png'
      },
      score: {
        fullTime: {
          home: 2,
          away: 1
        }
      },
      competition: {
        id: 2014,
        name: 'Primera Division',
        code: 'PD'
      }
    };

    const normalized = fromFootballData(fdMock);

    expect(normalized.external_id).toBe('435987');
    expect(normalized.home_team).toBe('Barcelona');
    expect(normalized.away_team).toBe('Real Madrid');
    expect(normalized.home_score).toBe(2);
    expect(normalized.away_score).toBe(1);
    expect(normalized.status).toBe('LIVE');
    expect(normalized.league).toBe('Primera Division');
    expect(normalized.source).toBe('football_data');
    expect(normalized._meta.home_team_external_id).toBe('65');
    expect(normalized._meta.away_team_external_id).toBe('78');
  });
});

