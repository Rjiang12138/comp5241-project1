import Landing from "@/components/ported/Landing";
import { courseAnalytics, courseWithMostLearners, getCourse } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Praxis — AI course studio for software engineering",
};

/**
 * The landing page shows one real number.
 *
 * The prototype's hero floated a "Cohort completion 76%" card because 76 was
 * typed into the markup. The same card now reads the busiest course and prints
 * what the event log actually says — if that is 59%, the page says 59%. A
 * marketing page is allowed to be optimistic; it is not allowed to invent
 * numbers about the people using the product.
 */
export default async function HomePage() {
  const courseId = await courseWithMostLearners();
  const course = courseId ? await getCourse(courseId) : null;
  const analytics = courseId ? await courseAnalytics(courseId, null) : null;

  return (
    <Landing
      live={
        course && analytics
          ? {
              courseTitle: course.title,
              modules: course.modules.length,
              learners: analytics.learners,
              averageProgress: analytics.averageProgress,
            }
          : null
      }
    />
  );
}
