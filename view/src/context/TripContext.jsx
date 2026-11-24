import { useState, useCallback } from 'react';
import { tripService } from '../services/tripService';
import { TripContext } from './tripContextInstance';

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchApprovedTrips = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tripService.getApprovedTrips(params);
      setTrips(res.trips || []);
      return res.trips;
    } catch (err) {
      setError(err.message || 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    trips,
    loading,
    error,
    fetchApprovedTrips,
    setTrips
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};
