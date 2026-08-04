export type StudentListRecord = {
  student_id: string;
  source_enrollment_id: number;
  registration_number: string;
  name: string;
  course: string;
  class_name: string;
  shift: string;
  status: string;
  enrolled_at: string;
};

export const studentListSql = `
WITH ranked_academic_enrollments AS (
  SELECT
    academic_enrollments.id,
    academic_enrollments.student_id,
    academic_enrollments.course,
    academic_enrollments.class_name,
    academic_enrollments.shift,
    academic_enrollments.status,
    academic_enrollments.enrolled_at,
    academic_enrollments.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY academic_enrollments.student_id
      ORDER BY
        academic_enrollments.enrolled_at DESC,
        academic_enrollments.created_at DESC,
        academic_enrollments.id DESC
    ) AS academic_position
  FROM academic_enrollments
)
SELECT
  students.id AS student_id,
  students.source_enrollment_id,
  students.registration_number,
  enrollments.name,
  ranked_academic_enrollments.course,
  ranked_academic_enrollments.class_name,
  ranked_academic_enrollments.shift,
  ranked_academic_enrollments.status,
  ranked_academic_enrollments.enrolled_at
FROM students
INNER JOIN enrollments
  ON enrollments.id = students.source_enrollment_id
INNER JOIN ranked_academic_enrollments
  ON ranked_academic_enrollments.student_id = students.id
  AND ranked_academic_enrollments.academic_position = 1
ORDER BY
  ranked_academic_enrollments.enrolled_at DESC,
  students.created_at DESC,
  students.id DESC
LIMIT 500
`;
