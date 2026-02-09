import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { quizBatchId } = await request.json();

    if (!quizBatchId) {
      return NextResponse.json(
        { error: 'Quiz batch ID is required' },
        { status: 400 }
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
        { status: 404 }
      );
    }

    const { data: studentFiles } = await supabase
      .from('quiz_batch_student_files')
      .select('*')
      .eq('quiz_batch_id', quizBatchId);

    const { data: materials } = await supabase
      .from('quiz_batch_materials')
      .select('lecture_material_id')
      .eq('quiz_batch_id', quizBatchId);

    const generatedQuizzes = [];

    if (studentFiles && studentFiles.length > 0) {
      for (const studentFile of studentFiles) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', studentFile.student_id)
          .maybeSingle();

        const quizContent = {
          questions: Array.from({ length: batchData.mcq_count }, (_, i) => ({
            number: i + 1,
            question: `Sample question ${i + 1} based on ${studentFile.file_name}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: batchData.fixed_mcq_answer_key?.[i] || 'A',
          })),
        };

        const answersContent = {
          answers: Array.from({ length: batchData.mcq_count }, (_, i) => ({
            number: i + 1,
            correct_answer: batchData.fixed_mcq_answer_key?.[i] || 'A',
            explanation: `Explanation for question ${i + 1}`,
          })),
        };

        const { data: insertedQuiz } = await supabase
          .from('quiz_generated')
          .insert({
            quiz_batch_id: quizBatchId,
            student_id: studentFile.student_id,
            student_file_url: studentFile.file_url,
            student_file_name: studentFile.file_name,
            mcq_count: batchData.mcq_count,
            short_answer_count: batchData.short_answer_count || 0,
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
    }

    if (materials && materials.length > 0 && studentFiles?.length === 0) {
      const { data: materialDetails } = await supabase
        .from('lecture_materials')
        .select('*')
        .in('id', materials.map(m => m.lecture_material_id));

      if (materialDetails && materialDetails.length > 0) {
        const material = materialDetails[0];

        const quizContent = {
          questions: Array.from({ length: batchData.mcq_count }, (_, i) => ({
            number: i + 1,
            question: `Sample question ${i + 1} based on ${material.material_name}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: batchData.fixed_mcq_answer_key?.[i] || 'A',
          })),
        };

        const answersContent = {
          answers: Array.from({ length: batchData.mcq_count }, (_, i) => ({
            number: i + 1,
            correct_answer: batchData.fixed_mcq_answer_key?.[i] || 'A',
            explanation: `Explanation for question ${i + 1}`,
          })),
        };

        const { data: insertedQuiz } = await supabase
          .from('quiz_generated')
          .insert({
            quiz_batch_id: quizBatchId,
            student_id: null,
            student_file_url: material.material_url,
            student_file_name: material.material_name,
            mcq_count: batchData.mcq_count,
            short_answer_count: batchData.short_answer_count || 0,
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
      { status: 500 }
    );
  }
}
