import { useState } from "react";
import { motion } from "framer-motion";
import { OrganizerSidebar } from "../../../pages/OrganizerDashboardPage";
import ProfileStats from "../ProfileStats";
import ProfileHeader from "../ProfileHeader";
import VerificationStatus from "./VerificationStatus";
import OrganizerDashboard from "./OrganizerDashboard";
import Documents from "./Documents";
import Notifications from "./Notifications";
import Reviews from "../Reviews";
import Gallery from "../Gallery";
import SettingsCard from "../SettingsCard";

const HASH_SECTIONS = {
  "organizer-profile": "overview",
  "organizer-profile-section-overview": "overview",
  "organizer-profile-section-verification": "verification",
  "organizer-profile-section-documents": "documents",
  "organizer-profile-section-notifications": "notifications",
  "organizer-profile-section-gallery": "gallery",
  "organizer-profile-section-reviews": "reviews",
  "organizer-profile-section-settings": "settings",
  "profile-notifications": "notifications",
  "organizer-reviews": "reviews",
  "organizer-settings": "settings",
};

export default function OrganizerProfile({
  user,
  data,
  statistics,
  onEdit,
  onNotificationRead,
  onNotificationDelete,
  onPasswordChange,
  onImageUpload,
  uploadingField,
  showSidebar = true,
  showProfileHeader = true,
  selectedSection,
  onSectionChange,
}) {
  const initialSection = selectedSection || HASH_SECTIONS[window.location.hash.slice(1)] || "overview";
  const [internalSection, setInternalSection] = useState(initialSection);
  const activeSection = selectedSection || internalSection;
  const verified = data.organizer.status === "Verified";

  const selectSection = (section) => {
    if (onSectionChange) onSectionChange(section);
    else setInternalSection(section);
    window.requestAnimationFrame(() => {
      document.getElementById("organizer-profile-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const content = {
    overview: (
      <div className="space-y-8">
        {!showProfileHeader && (
          <ProfileHeader
            user={user}
            role="organizer"
            onEdit={onEdit}
            onImageUpload={onImageUpload}
            uploadingField={uploadingField}
          />
        )}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00796B]">Organizer experience</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{data.organizer.experience || "Add your travel and hosting experience to help travelers get to know you."}</p>
        </section>
        <OrganizerDashboard stats={data.organizerStats} />
        <ProfileStats role="organizer" statistics={statistics} />
      </div>
    ),
    verification: <VerificationStatus verified={verified} status={data.organizer.status} />,
    documents: <Documents documents={data.documents} />,
    notifications: <Notifications notifications={data.notifications} onMarkRead={onNotificationRead} onDelete={onNotificationDelete} />,
    gallery: <Gallery images={data.gallery} onAdd={data.onGalleryAdd} />,
    reviews: <Reviews reviews={data.reviews} />,
    settings: <SettingsCard onEditProfile={onEdit} onPasswordChange={onPasswordChange} onOpenNotifications={() => selectSection("notifications")} />,
  };
  const contentPanel = (
    <section id="organizer-profile-content" className="min-w-0 scroll-mt-24">
      <motion.div
        key={activeSection}
        id={`organizer-profile-section-${activeSection}`}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
      >
        {content[activeSection]}
      </motion.div>
    </section>
  );

  return (
    <motion.div
      key="organizer-profile"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {showProfileHeader && (
        <section id="organizer-profile" className="scroll-mt-24">
          <ProfileHeader user={user} role="organizer" onEdit={onEdit} onImageUpload={onImageUpload} uploadingField={uploadingField} />
        </section>
      )}
      {showSidebar ? (
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <OrganizerSidebar
            activeProfileSection={activeSection}
            onProfileSectionSelect={selectSection}
            organizerStatus={data.organizer.status}
          />
          {contentPanel}
        </div>
      ) : contentPanel}
    </motion.div>
  );
}
