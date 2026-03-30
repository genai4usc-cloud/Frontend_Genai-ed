import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const buildQuizContent = (
  questionCount: number,
  fixedAnswerKey: string[] | null,
  sourceLabel: string,
) => ({
  questions: Array.from({ length: questionCount }, (_, index) => ({
    number: index + 1,
    question: `Sample question ${index + 1} based on ${sourceLabel}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_answer: fixedAnswerKey?.[index] || 'A',
  })),
});

const buildAnswersContent = (
  questionCount: number,
  fixedAnswerKey: string[] | null,
) => ({
  answers: Array.from({ length: questionCount }, (_, index) => ({
    number: index + 1,
    correct_answer: fixedAnswerKey?.[index] || 'A',
    explanation: `Explanation for question ${index + 1}`,
  })),
});

export async function POST(request: Request) {
  try {
    const { quizBatchId } = await request.json();

    if (!quizBatchId) {
      return NextResponse.json(
        { error: 'Quiz batch ID is required' },
        { status: 400 },
      );
    }

    const { data: batchData, error: batchError } = await supabase
      .from('quiz_batches')
      .select('*')
      .eq('id', quizBatchId)
      .single();

    if (batchError || !batchData) {
      return NextResponse.json(
        { error: 'Quiz batch not found' },
        { status: 404 },
      );
    }

    const [
      { data: batchStudents },
      { data: studentFiles },
      { data: materials },
    ] = await Promise.all([
      supabase
        .from('quiz_batch_students')
        .select('student_id')
        .eq('quiz_batch_id', quizBatchId),
      supabase
        .from('quiz_batch_student_files')
        .select('*')
        .eq('quiz_batch_id', quizBatchId),
      supabase
        .from('quiz_batch_materials')
        .select('lecture_material_id')
        .eq('quiz_batch_id', quizBatchId),
    ]);

    await supabase
      .from('quiz_generated')
      .delete()
      .eq('quiz_batch_id', quizBatchId);

    const generatedQuizzes: Array<Record<string, any>> = [];
    const questionCount = batchData.mcq_count || 0;
    const shortAnswerCount = batchData.short_answer_count || 0;
    const fixedAnswerKey = batchData.fixed_mcq_answer_key || null;

    if (
      batchData.material_source_mode === 'general' &&
      batchData.general_file_url &&
      batchData.general_file_name
    ) {
      for (const batchStudent of batchStudents || []) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', batchStudent.student_id)
          .maybeSingle();

        const quizContent = buildQuizContent(
          questionCount,
          fixedAnswerKey,
          batchData.general_file_name,
        );
        const answersContent = buildAnswersContent(questionCount, fixedAnswerKey);

        const { data: insertedQuiz } = await supabase
          .from('quiz_generated')
          .insert({
            quiz_batch_id: quizBatchId,
            student_id: batchStudent.student_id,
            student_file_url: batchData.general_file_url,
            student_file_name: batchData.general_file_name,
            mcq_count: questionCount,
            short_answer_count: shortAnswerCount,
            quiz_content_json: quizContent,
            answers_content_json: answersContent,
            quiz_pdf_url: null,
            answers_pdf_url: null,
          })
          .select()
          .single();

        if (insertedQuiz) {
          generatedQuizzes.push({
            ...insertedQuiz,
            student_name: profileData
              ? `${profileData.first_name} ${profileData.last_name}`
              : 'Student',
          });
        }
      }
    } else if (studentFiles && studentFiles.length > 0) {
      for (const studentFile of studentFiles) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', studentFile.student_id)
          .maybeSingle();

        const quizContent = buildQuizContent(
          questionCount,
          fixedAnswerKey,
          studentFile.file_name,
        );
        const answersContent = buildAnswersContent(questionCount, fixedAnswerKey);

        const { data: insertedQuiz } = await supabase
          .from('quiz_generated')
          .insert({
            quiz_batch_id: quizBatchId,
            student_id: studentFile.student_id,
            student_file_url: studentFile.file_url,
            student_file_name: studentFile.file_name,
            mcq_count: questionCount,
            short_answer_count: shortAnswerCount,
            quiz_content_json: quizContent,
            answers_content_json: answersContent,
            quiz_pdf_url: null,
            answers_pdf_url: null,
          })
          .select()
          .single();

        if (insertedQuiz) {
          generatedQuizzes.push({
            ...insertedQuiz,
            student_name: profileData
              ? `${profileData.first_name} ${profileData.last_name}`
              : 'Student',
          });
        }
      }
    } else if (materials && materials.length > 0) {
      const { data: materialDetails } = await supabase
        .from('lecture_materials')
        .select('*')
        .in('id', materials.map((material) => material.lecture_material_id));

      if (materialDetails && materialDetails.length > 0) {
        const material = materialDetails[0];

        const quizContent = buildQuizContent(
          questionCount,
          fixedAnswerKey,
          material.material_name,
        );
        const answersContent = buildAnswersContent(questionCount, fixedAnswerKey);

        const { data: insertedQuiz } = await supabase
          .from('quiz_generated')
          .insert({
            quiz_batch_id: quizBatchId,
            student_id: null,
            student_file_url: material.material_url,
            student_file_name: material.material_name,
            mcq_count: questionCount,
            short_answer_count: shortAnswerCount,
            quiz_content_json: quizContent,
            answers_content_json: answersContent,
            quiz_pdf_url: null,
            answers_pdf_url: null,
          })
          .select()
          .single();

        if (insertedQuiz) {
          generatedQuizzes.push({
            ...insertedQuiz,
            student_name: 'Course Material',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      quizzes: generatedQuizzes,
    });
  } catch (error) {
    console.error('Error generating quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to generate quizzes' },
      { status: 500 },
    );
  }
}
