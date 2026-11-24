export const getUserId = (user) => user?._id || user?.id;

export const getUserName = (user) =>
  user?.fullName || user?.name || user?.username || user?.email?.split("@")[0] || "Unnamed user";

export const getUserEmail = (user) => user?.email || "No email provided";

export const getUserRole = (user) => {
  if (user?.role === "Admin") return "Admin";
  if (
    user?.organizerVerified
    || user?.organizer?.status === "Approved"
    || (user?.organizer?.isOrganizer && user?.organizer?.status === "Approved")
  ) {
    return "Organizer";
  }
  return "Trip Mate";
};

export const getUserStatus = (user) => {
  if (user?.status) return String(user.status);
  if (typeof user?.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
  if (typeof user?.active === "boolean") return user.active ? "Active" : "Inactive";
  return "Unknown";
};

export const getUsersFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.users)) return response.data.users;
  return null;
};

export const getUserFromResponse = (response) =>
  response?.user || response?.data?.user || response?.data || response;

export const getTripsFromResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.createdTrips) || Array.isArray(response?.joinedTrips)) {
    return [
      ...(Array.isArray(response.createdTrips) ? response.createdTrips.map((trip) => ({ ...trip, _adminRelationship: "Created" })) : []),
      ...(Array.isArray(response.joinedTrips) ? response.joinedTrips.map((trip) => ({ ...trip, _adminRelationship: "Joined" })) : []),
    ];
  }
  if (Array.isArray(response?.trips)) return response.trips;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.createdTrips) || Array.isArray(response?.data?.joinedTrips)) {
    return getTripsFromResponse(response.data);
  }
  if (Array.isArray(response?.data?.trips)) return response.data.trips;
  return null;
};
