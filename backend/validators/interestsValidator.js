'use strict';

/**
 * Interests Validators
 * ===================
 * Validation functions for user interests.
 */

const logger = require('../utils/logger');

/**
 * Validate country codes
 */
function validateCountryCodes(countries) {
  if (!Array.isArray(countries)) {
    return { valid: false, errors: ['favorite_countries must be an array'] };
  }
  
  if (countries.length > 10) {
    return { valid: false, errors: ['Maximum 10 countries allowed'] };
  }
  
  const validCountryCodes = [
    'EG', 'AR', 'BR', 'DE', 'ES', 'FR', 'GB', 'IT', 'NL', 'PT',
    'US', 'CA', 'MX', 'AU', 'JP', 'KR', 'CN', 'IN', 'RU', 'SA',
    'QA', 'AE', 'NG', 'ZA', 'KE', 'MA', 'TN', 'DZ', 'SN', 'CI'
  ];
  
  const invalidCountries = countries.filter(c => !validCountryCodes.includes(c));
  if (invalidCountries.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid country codes: ${invalidCountries.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate team names
 */
function validateTeamNames(teams) {
  if (!Array.isArray(teams)) {
    return { valid: false, errors: ['favorite_teams must be an array'] };
  }
  
  if (teams.length > 20) {
    return { valid: false, errors: ['Maximum 20 teams allowed'] };
  }
  
  const invalidTeams = teams.filter(t => !t || typeof t !== 'string' || t.trim().length === 0);
  if (invalidTeams.length > 0) {
    return { 
      valid: false, 
      errors: ['All team names must be non-empty strings'] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate competitions
 */
function validateCompetitions(competitions) {
  if (!Array.isArray(competitions)) {
    return { valid: false, errors: ['favorite_competitions must be an array'] };
  }
  
  if (competitions.length > 15) {
    return { valid: false, errors: ['Maximum 15 competitions allowed'] };
  }
  
  const validCompetitions = [
    'world_cup', 'champions_league', 'premier_league', 'la_liga',
    'bundesliga', 'serie_a', 'ligue_1', 'europa_league', 'europa_conference_league',
    'copa_libertadores', 'copa_america', 'euro', 'african_cup', 'afc_champions_league',
    'concacaf_champions_league', 'fa_cup', 'dfb_pokal', 'copa_del_rey'
  ];
  
  const invalidCompetitions = competitions.filter(c => !validCompetitions.includes(c));
  if (invalidCompetitions.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid competitions: ${invalidCompetitions.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate players
 */
function validatePlayers(players) {
  if (!Array.isArray(players)) {
    return { valid: false, errors: ['favorite_players must be an array'] };
  }
  
  if (players.length > 30) {
    return { valid: false, errors: ['Maximum 30 players allowed'] };
  }
  
  const invalidPlayers = players.filter(p => !p || typeof p !== 'string' || p.trim().length === 0);
  if (invalidPlayers.length > 0) {
    return { 
      valid: false, 
      errors: ['All player names must be non-empty strings'] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate clubs
 */
function validateClubs(clubs) {
  if (!Array.isArray(clubs)) {
    return { valid: false, errors: ['favorite_clubs must be an array'] };
  }
  
  if (clubs.length > 20) {
    return { valid: false, errors: ['Maximum 20 clubs allowed'] };
  }
  
  const invalidClubs = clubs.filter(c => !c || typeof c !== 'string' || c.trim().length === 0);
  if (invalidClubs.length > 0) {
    return { 
      valid: false, 
      errors: ['All club names must be non-empty strings'] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate interests
 */
function validateInterests(interests) {
  if (!Array.isArray(interests)) {
    return { valid: false, errors: ['interests must be an array'] };
  }
  
  if (interests.length > 15) {
    return { valid: false, errors: ['Maximum 15 interests allowed'] };
  }
  
  const validInterests = [
    'predictions', 'transfers', 'live_scores', 'player_stats',
    'fantasy', 'international_football', 'world_cup', 'tactics',
    'youth_football', 'womens_football', 'coaching', 'refereeing',
    'stadiums', 'history', 'memorabilia', 'statistics'
  ];
  
  const invalidInterests = interests.filter(i => !validInterests.includes(i));
  if (invalidInterests.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid interests: ${invalidInterests.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate interests update data
 */
function validateInterestsUpdate(data) {
  const errors = [];
  
  // All fields are optional for updates
  if (data.favorite_countries) {
    const countryValidation = validateCountryCodes(data.favorite_countries);
    if (!countryValidation.valid) {
      errors.push(...countryValidation.errors);
    }
  }
  
  if (data.favorite_teams) {
    const teamValidation = validateTeamNames(data.favorite_teams);
    if (!teamValidation.valid) {
      errors.push(...teamValidation.errors);
    }
  }
  
  if (data.favorite_competitions) {
    const competitionValidation = validateCompetitions(data.favorite_competitions);
    if (!competitionValidation.valid) {
      errors.push(...competitionValidation.errors);
    }
  }
  
  if (data.favorite_players) {
    const playerValidation = validatePlayers(data.favorite_players);
    if (!playerValidation.valid) {
      errors.push(...playerValidation.errors);
    }
  }
  
  if (data.favorite_clubs) {
    const clubValidation = validateClubs(data.favorite_clubs);
    if (!clubValidation.valid) {
      errors.push(...clubValidation.errors);
    }
  }
  
  if (data.interests) {
    const interestValidation = validateInterests(data.interests);
    if (!interestValidation.valid) {
      errors.push(...interestValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateCountryCodes,
  validateTeamNames,
  validateCompetitions,
  validatePlayers,
  validateClubs,
  validateInterests,
  validateInterestsUpdate,
};
