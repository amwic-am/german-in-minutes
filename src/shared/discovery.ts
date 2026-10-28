import { COURSES } from "./data";
const learningImage = "/images/learning-banner.jpg";
const groupImage = "/images/study-group.jpg";

export const courseImages = [learningImage, groupImage, groupImage, learningImage, groupImage, learningImage];
export const topics = ["German for beginners", "Speaking", "Grammar", "Business German", "Goethe exam", "Vocabulary", "Listening", "A1", "B1", "C1"];
export const categories = [
  { slug: "beginner", name: "Beginner German", description: "Start with the essentials of everyday communication.", symbol: "BookOpen", courses: ["german-foundations-a1", "daily-german-a2"] },
  { slug: "conversation", name: "Conversation & fluency", description: "Find your voice in real conversations.", symbol: "MessagesSquare", courses: ["everyday-fluency-b1", "daily-german-a2"] },
  { slug: "professional", name: "Business & professional", description: "Communicate with confidence at work and university.", symbol: "BriefcaseBusiness", courses: ["professional-german-b2", "goethe-c1-prep"] },
  { slug: "exam", name: "Exam preparation", description: "Prepare for your next Goethe exam.", symbol: "GraduationCap", courses: ["goethe-b1-preparation", "goethe-c1-prep"] },
];

export function searchCourses(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return COURSES.filter(course => words.every(word => `${course.title} ${course.level} ${course.levelName} ${course.description} ${course.includes.join(" ")}`.toLowerCase().includes(word)));
}

export function coursesInCategory(slug: string) {
  const category = categories.find(item => item.slug === slug);
  return category ? COURSES.filter(course => category.courses.includes(course.slug)) : COURSES;
}