'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile, Course, LectureMaterial } from '@/lib/supabase';
import EducatorLayout from '@/components/EducatorLayout';
import { ArrowLeft, Upload, File, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMultipleFiles, validateFileSize } from '@/lib/fileUpload';

type CourseWithMaterials = Course & {
  materials: Array<{ url: string; name: string; courseTitle: string; courseCode: string }>;
};

type MaterialWithType = {
  url: string;
  name: string;
  type: 'main' | 'background';
  sourceCourseId?: string;
  courseTitle?: string;
  courseCode?: string;
};

export default function CreateLecture() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const [courses, setCourses] = useState<CourseWithMaterials[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [addToPersonalLibrary, setAddToPersonalLibrary] = useState(false);
  const [addToUSCLibrary, setAddToUSCLibrary] = useState(false);

  const [preloadedMaterials, setPreloadedMaterials] = useState<Array<{ url: string; name: string; courseTitle: string; courseCode: string; sourceCourseId: string }>>([]);
  const [selectedPreloadedMaterialUrls, setSelectedPreloadedMaterialUrls] = useState<string[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [allMaterials, setAllMaterials] = useState<MaterialWithType[]>([]);

  const [expandedStep, setExpandedStep] = useState(1);
  const additionalFilesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedCourseIds.length > 0) {
      loadCourseMaterials();
    } else {
      setPreloadedMaterials([]);
      setSelectedPreloadedMaterialUrls([]);
    }
  }, [selectedCourseIds]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/educator/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileData || profileData.role !== 'educator') {
        await supabase.auth.signOut();
        router.push('/educator/login');
        return;
      }

      setProfile(profileData);

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('educator_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesData) {
        const coursesWithMaterials: CourseWithMaterials[] = coursesData.map(course => ({
          ...course,
          materials: []
        }));
        setCourses(coursesWithMaterials);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseMaterials = () => {
    const materials: Array<{ url: string; name: string; courseTitle: string; courseCode: string; sourceCourseId: string }> = [];

    selectedCourseIds.forEach(courseId => {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        course.course_materials_urls.forEach((url, index) => {
          materials.push({
            url,
            name: `Material ${index + 1}`,
            courseTitle: course.title,
            courseCode: course.code,
            sourceCourseId: course.id
          });
        });

        course.background_materials_urls.forEach((url, index) => {
          materials.push({
            url,
            name: `Background Material ${index + 1}`,
            courseTitle: course.title,
            courseCode: course.code,
            sourceCourseId: course.id
          });
        });
      }
    });

    setPreloadedMaterials(materials);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const togglePreloadedMaterial = (url: string) => {
    setSelectedPreloadedMaterialUrls(prev =>
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const handleAdditionalFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (!validateFileSize(file, 10)) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      validFiles.push(file);
    });

    setAdditionalFiles(prev => [...prev, ...validFiles]);
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinueToMaterials = () => {
    if (selectedCourseIds.length === 0 && !addToPersonalLibrary && !addToUSCLibrary) {
      toast.error('Please select at least one course or library');
      return;
    }

    setCurrentStep(2);
    setExpandedStep(2);

    const materials: MaterialWithType[] = [];

    preloadedMaterials.forEach(material => {
      if (selectedPreloadedMaterialUrls.includes(material.url)) {
        materials.push({
          url: material.url,
          name: material.name,
          type: 'main',
          sourceCourseId: material.sourceCourseId,
          courseTitle: material.courseTitle,
          courseCode: material.courseCode
        });
      }
    });

    setAllMaterials(materials);
  };

  const handleContinueToContentStyle = () => {
    const materials: MaterialWithType[] = [];

    preloadedMaterials.forEach(material => {
      if (selectedPreloadedMaterialUrls.includes(material.url)) {
        materials.push({
          url: material.url,
          name: material.name,
          type: 'main',
          sourceCourseId: material.sourceCourseId,
          courseTitle: material.courseTitle,
          courseCode: material.courseCode
        });
      }
    });

    setAllMaterials(materials);
    setCurrentStep(3);
    setExpandedStep(3);
  };

  const changeMaterialType = (url: string, type: 'main' | 'background') => {
    setAllMaterials(prev =>
      prev.map(m => (m.url === url ? { ...m, type } : m))
    );
  };

  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Select Course or Library', subtitle: 'Choose where to publish this content' },
    { number: 2, title: 'Select Materials', subtitle: 'Add any additional materials for the lecture' },
    { number: 3, title: 'Select Content Style', subtitle: 'Choose one or more content formats' },
    { number: 4, title: 'Script or Prompt Engineering', subtitle: 'Add your script or generate with AI' },
    { number: 5, title: 'Generate Content', subtitle: 'Review and regenerate if needed' },
    { number: 6, title: 'Publish Content', subtitle: 'Choose where to publish and download options' }
  ];

  return (
    <EducatorLayout profile={profile}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/educator/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Lecture</h1>
            <p className="text-gray-600 mt-1">Follow the steps below to create your AI-powered lecture content</p>
          </div>
        </div>

        <div className="bg-[#990000] text-white rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-2">Create New Lecture</h2>
          <p className="text-white/90">Follow the steps below to create AI-powered educational content</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isExpanded = expandedStep === step.number;

            return (
              <div key={step.number} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedStep(isExpanded ? 0 : step.number)}
                  className="w-full flex items-center gap-4 p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    isCompleted ? 'bg-green-600' : isCurrent ? 'bg-[#990000]' : 'bg-gray-300'
                  }`}>
                    {isCompleted ? <Check className="w-6 h-6" /> : step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.subtitle}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                </button>

                {isExpanded && step.number === 1 && (
                  <div className="p-6 pt-0 space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Select Course(s)</h4>
                      <div className="space-y-2">
                        {courses.map(course => (
                          <label key={course.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCourseIds.includes(course.id)}
                              onChange={() => toggleCourse(course.id)}
                              className="w-5 h-5 text-[#990000] rounded focus:ring-[#990000]"
                            />
                            <span className="font-medium text-gray-900">{course.code} - {course.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Add to Library</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addToPersonalLibrary}
                            onChange={(e) => setAddToPersonalLibrary(e.target.checked)}
                            className="w-5 h-5 text-[#990000] rounded focus:ring-[#990000]"
                          />
                          <span className="font-medium text-gray-900">Personal Library</span>
                        </label>
                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addToUSCLibrary}
                            onChange={(e) => setAddToUSCLibrary(e.target.checked)}
                            className="w-5 h-5 text-[#990000] rounded focus:ring-[#990000]"
                          />
                          <span className="font-medium text-gray-900">USC Library</span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleContinueToMaterials}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue to Materials Selection
                    </button>
                  </div>
                )}

                {isExpanded && step.number === 2 && (
                  <div className="p-6 pt-0 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Add Materials for Your Lecture</h4>
                      <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
                        <Info className="w-4 h-4" />
                        What's the difference?
                      </button>
                    </div>

                    {preloadedMaterials.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Preloaded Course Materials</h4>
                        <p className="text-sm text-gray-600 mb-4">Select materials from your courses:</p>
                        <div className="space-y-2">
                          {preloadedMaterials.map((material, index) => (
                            <label key={index} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPreloadedMaterialUrls.includes(material.url)}
                                onChange={() => togglePreloadedMaterial(material.url)}
                                className="w-5 h-5 text-[#990000] rounded focus:ring-[#990000]"
                              />
                              <File className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{material.name}</p>
                                <p className="text-sm text-gray-600">{material.courseCode}</p>
                              </div>
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {getFileExtension(material.url)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Upload Additional Files</h4>
                      <input
                        ref={additionalFilesInputRef}
                        type="file"
                        multiple
                        onChange={handleAdditionalFilesSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => additionalFilesInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors"
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium mb-1">Click to upload files</p>
                        <p className="text-gray-500 text-sm">PDF, DOCX, TXT, XLSX, PPTX, JPG, PNG</p>
                      </button>

                      {additionalFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {additionalFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <File className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{file.name}</p>
                                  <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeAdditionalFile(index)}
                                className="text-red-600 hover:text-red-700 font-medium text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {allMaterials.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">All Added Materials</h4>
                        <div className="space-y-2">
                          {allMaterials.map((material, index) => (
                            <div key={index} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                              <File className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{material.name}</p>
                                {material.courseCode && (
                                  <p className="text-sm text-gray-600">{material.courseCode}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => changeMaterialType(material.url, 'main')}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    material.type === 'main'
                                      ? 'bg-[#990000] text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  Main
                                </button>
                                <button
                                  onClick={() => changeMaterialType(material.url, 'background')}
                                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    material.type === 'background'
                                      ? 'bg-[#FFCC00] text-black'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  Background
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleContinueToContentStyle}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue to Content Style
                    </button>
                  </div>
                )}

                {isExpanded && step.number === 3 && (
                  <div className="p-6 pt-0">
                    <p className="text-gray-600 mb-4">Content style selection will be implemented in a future update.</p>
                    <button
                      onClick={() => {
                        setCurrentStep(4);
                        setExpandedStep(4);
                      }}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue to Script/Prompt
                    </button>
                  </div>
                )}

                {isExpanded && step.number === 4 && (
                  <div className="p-6 pt-0">
                    <p className="text-gray-600 mb-4">Script and prompt engineering will be implemented in a future update.</p>
                    <button
                      onClick={() => {
                        setCurrentStep(5);
                        setExpandedStep(5);
                      }}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue to Generate Content
                    </button>
                  </div>
                )}

                {isExpanded && step.number === 5 && (
                  <div className="p-6 pt-0">
                    <p className="text-gray-600 mb-4">Content generation will be implemented in a future update.</p>
                    <button
                      onClick={() => {
                        setCurrentStep(6);
                        setExpandedStep(6);
                      }}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue to Publish
                    </button>
                  </div>
                )}

                {isExpanded && step.number === 6 && (
                  <div className="p-6 pt-0">
                    <p className="text-gray-600 mb-4">Publish options will be implemented in a future update.</p>
                    <button
                      onClick={() => toast.success('Lecture creation flow completed! Full implementation coming soon.')}
                      className="bg-[#990000] hover:bg-[#770000] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      Publish Lecture
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </EducatorLayout>
  );
}
