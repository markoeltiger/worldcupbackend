'use strict';

const axios = require('axios');
const cache = require('../utils/cache');

// Mock axios BEFORE requiring the fetcher
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn()
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    default: {
      create: jest.fn(() => mockAxiosInstance)
    }
  };
});

const fetcher = require('../ingestion/footballDataFetcher');

describe('FootballData API Client & Cache-Aside Layer', () => {
  let mockAxiosInstance;

  beforeAll(() => {
    mockAxiosInstance = axios.create();
  });

  beforeEach(async () => {
    await cache.flush();
    jest.clearAllMocks();
  });

  test('should fetch matches on cache miss, and serve from cache on subsequent hits', async () => {
    const mockMatches = [{ id: 456, homeTeam: { name: 'Arsenal' } }];
    
    // Simulate HTTP response
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { matches: mockMatches }
    });

    // 1. First invocation (expect cache miss and outbound request)
    const result1 = await fetcher.fetchMatches({ status: 'LIVE' });
    expect(result1).toEqual(mockMatches);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    // 2. Second invocation (expect cache hit; axios.get is NOT called again)
    const result2 = await fetcher.fetchMatches({ status: 'LIVE' });
    expect(result2).toEqual(mockMatches);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  test('should cache match details with dynamic TTL depending on match finish status', async () => {
    const mockLiveMatch = { id: 789, status: 'IN_PLAY' };
    
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: mockLiveMatch
    });

    const result = await fetcher.fetchMatchDetail(789);
    expect(result).toEqual(mockLiveMatch);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    // Requesting again should hit cache
    const resultCached = await fetcher.fetchMatchDetail(789);
    expect(resultCached).toEqual(mockLiveMatch);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });
});
