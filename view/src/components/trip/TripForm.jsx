import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { tripService } from "../../services/tripService";
import NavigationButtons from "./NavigationButtons";
import ProgressBar from "./ProgressBar";
import StepBasicInfo from "./StepBasicInfo";
import StepBudget from "./StepBudget";
import StepItinerary from "./StepItinerary";
import StepPreferences from "./StepPreferences";
import StepReview from "./StepReview";
import { DEFAULT_TRIP_CATEGORIES } from "../../constants/tripCategories";
import { platformService } from "../../services/platformService";

const initialForm = {
  title: "",
  description: "",
  destination: "",
  country: "",
  state: "",
  city: "",
  famousPlaces: [],
  category: "Adventure",
  coverImage: { url: "", alt: "Trip cover image" },
  images: [],
  startDate: "",
  endDate: "",
  totalBudget: "",
  pricePerPerson: "",
  maxMembers: 4,
  transportation: "Other",
  hotelPreference: "Budget",
  foodPreference: "Both",
  activityPreference: "",
  itinerary: [],
  isPublic: true,
};

const parseDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const dateValue = (date, offset) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + offset);
  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const stepValidators = [
  (form) => {
    if (form.title.trim().length < 3) return "Trip title must be at least 3 characters.";
    if (!form.country || !form.state || !form.city) return "Select a country, state, and city.";
    if (!form.category) return "Choose a trip category.";
    if (!form.coverImage.url.trim()) return "Add a cover image URL.";
    if (!form.startDate || !form.endDate) return "Choose your trip dates.";
    if (form.startDate > form.endDate) return "The end date must be on or after the start date.";
    return "";
  },
  (form) => {
    if (form.totalBudget === "" || !Number.isFinite(Number(form.totalBudget)) || Number(form.totalBudget) < 0) return "Enter a valid total budget.";
    if (form.pricePerPerson === "" || !Number.isFinite(Number(form.pricePerPerson)) || Number(form.pricePerPerson) < 0) return "Enter a valid price per person.";
    if (!Number.isInteger(Number(form.maxMembers)) || Number(form.maxMembers) < 1) return "Maximum travelers must be at least one.";
    return "";
  },
  () => "",
  () => "",
  () => "",
];

export default function TripForm({ onCreated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_TRIP_CATEGORIES);
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    let active = true;
    platformService.getSettings()
      .then((response) => {
        const configuredCategories = response.data?.tripCategories;
        if (!Array.isArray(configuredCategories) || configuredCategories.length === 0) {
          throw new Error("The server returned an invalid trip categories list.");
        }
        if (active) {
          setCategories(configuredCategories);
          setForm((current) => ({
            ...current,
            category: configuredCategories.includes(current.category) ? current.category : configuredCategories[0],
            itinerary: current.itinerary.map((day) => ({
              ...day,
              activities: day.activities.map((activity) => ({
                ...activity,
                category: configuredCategories.includes(activity.category) ? activity.category : configuredCategories[0],
              })),
            })),
          }));
          setCategoryError("");
        }
      })
      .catch((error) => {
        if (active) setCategoryError(error.message || "Unable to load current trip categories; using defaults.");
      });
    return () => { active = false; };
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateDates = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!next.startDate || !next.endDate) return next;
      const firstDate = parseDate(next.startDate);
      const lastDate = parseDate(next.endDate);
      if (!firstDate || !lastDate || firstDate > lastDate) return next;
      const count = Math.min(Math.floor((lastDate - firstDate) / 86400000) + 1, 30);
      const itinerary = Array.from({ length: count }, (_, index) => current.itinerary[index] || ({
        dayNumber: index + 1,
        date: dateValue(firstDate, index),
        title: "",
        activities: [],
      })).map((day, index) => ({
        ...day,
        dayNumber: index + 1,
        date: dateValue(firstDate, index),
      }));
      return { ...next, itinerary };
    });
  };

  const updateDay = (index, key, value) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.map((day, dayIndex) => dayIndex === index ? { ...day, [key]: value } : day),
    }));
  };

  const addDay = () => {
    setForm((current) => ({
      ...current,
      itinerary: [...current.itinerary, {
        dayNumber: current.itinerary.length + 1,
        date: current.itinerary[current.itinerary.length - 1]?.date
          ? dateValue(parseDate(current.itinerary[current.itinerary.length - 1].date), 1)
          : current.startDate,
        title: "",
        activities: [],
      }],
    }));
  };

  const removeDay = (index) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.filter((_, dayIndex) => dayIndex !== index)
        .map((day, dayIndex) => ({ ...day, dayNumber: dayIndex + 1 })),
    }));
  };

  const updateActivity = (dayIndex, activityIndex, key, value) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.map((day, index) => index !== dayIndex ? day : ({
        ...day,
        activities: day.activities.map((activity, itemIndex) => itemIndex === activityIndex ? { ...activity, [key]: value } : activity),
      })),
    }));
  };

  const addActivity = (dayIndex) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.map((day, index) => index !== dayIndex ? day : ({
        ...day,
        activities: [...day.activities, {
          title: "",
          description: "",
          location: "",
          date: day.date || undefined,
          startTime: "",
          endTime: "",
          estimatedCost: 0,
          category: categories.includes("Other") ? "Other" : categories[0],
          notes: "",
        }],
      })),
    }));
  };

  const removeActivity = (dayIndex, activityIndex) => {
    setForm((current) => ({
      ...current,
      itinerary: current.itinerary.map((day, index) => index !== dayIndex ? day : ({
        ...day,
        activities: day.activities.filter((_, itemIndex) => itemIndex !== activityIndex),
      })),
    }));
  };

  const goNext = () => {
    const error = stepValidators[currentStep](form);
    if (error) {
      toast.error(error);
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, 4));
  };

  const submit = async () => {
    const error = stepValidators[0](form) || stepValidators[1](form);
    if (error) {
      toast.error(error);
      setCurrentStep(error.includes("budget") || error.includes("travelers") ? 1 : 0);
      return;
    }

    const incompleteActivity = form.itinerary.some((day) =>
      day.activities.some((activity) => !activity.title.trim())
    );
    if (incompleteActivity) {
      toast.error("Add a title to each itinerary activity or remove the empty activity.");
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        destination: form.city.trim(),
        country: form.country,
        state: form.state,
        city: form.city,
        famousPlaces: form.famousPlaces,
        totalBudget: Number(form.totalBudget),
        pricePerPerson: Number(form.pricePerPerson),
        maxMembers: Number(form.maxMembers),
        coverImage: { ...form.coverImage, url: form.coverImage.url.trim() },
        images: form.images
          .filter((image) => image.url.trim())
          .map((image) => ({ ...image, url: image.url.trim() })),
        itinerary: form.itinerary.map((day) => ({
          ...day,
          date: day.date || undefined,
          activities: day.activities.map((activity) => ({
            ...activity,
            date: day.date || activity.date || undefined,
            estimatedCost: Number(activity.estimatedCost) || 0,
          })),
        })),
      };
      const result = await tripService.createTrip(payload);
      if (result?.success === false) throw new Error(result.message || "Unable to create trip.");
      toast.success(result?.message || "Trip submitted for review.");
      if (onCreated) onCreated(result);
      else navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.message || "Unable to create trip.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepProps = { form, update: (key, value) => update(key, value), updateDates };
  const content = [
    <StepBasicInfo key="basic" {...stepProps} categories={categories} categoryError={categoryError} />,
    <StepBudget key="budget" {...stepProps} />,
    <StepPreferences key="preferences" {...stepProps} />,
    <StepItinerary
      key="itinerary"
      itinerary={form.itinerary}
      startDate={form.startDate}
      endDate={form.endDate}
      onUpdateDay={updateDay}
      onAddDay={addDay}
      onRemoveDay={removeDay}
      onAddActivity={addActivity}
      onUpdateActivity={updateActivity}
      onRemoveActivity={removeActivity}
      categories={categories}
    />,
    <StepReview key="review" form={form} />,
  ];

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-8">
      <ProgressBar currentStep={currentStep} />
      {content[currentStep]}
      <NavigationButtons
        currentStep={currentStep}
        onBack={() => setCurrentStep((step) => Math.max(step - 1, 0))}
        onNext={goNext}
        onSubmit={submit}
        submitting={submitting}
      />
    </section>
  );
}
