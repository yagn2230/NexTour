export const isVerifiedOrganizer = (user) => {
  const status = user?.organizer?.status;
  if (status === "Pending" || status === "Rejected") return false;
  return Boolean(user?.organizerVerified || status === "Approved");
};
