// src/components/MarksheetSheet.tsx
import { classLabel } from '@/utils/classes';
import SchoolSheetHeader from './SchoolSheetHeader';

export interface MarksheetData {
  examName: string;
  student: {
    studentId: string;
    nameBn: string;
    nameEn?: string;
    classId: string;
    sessionId?: string;
    roll?: string | number;
    fatherName?: string;
    motherName?: string;
    address?: string;
    dateOfBirth?: string;
    photo?: string;
  };
  subjects: Array<{
    name: string;
    fullMarks: number;
    marks: number | null;
    grade: string;
    gradePoint: number;
    passed?: boolean;
    isOptional?: boolean;
  }>;
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
  promoted?: boolean;
}

function fmtDob(v?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (v ?? '');
}

const Cell = ({ k, v }: { k: string; v?: string | number }) => (
  <tr>
    <td className="w-[34%] border border-black px-2 py-1 font-semibold">{k}</td>
    <td className="border border-black px-2 py-1">{v ?? ''}</td>
  </tr>
);

/** Printable marksheet (A4) with student details. */
export default function MarksheetSheet({ data }: { data: MarksheetData }) {
  const st = data.student;
  return (
    <div>
      <SchoolSheetHeader title="মার্কশিট / Marksheet" />
      <p className="mb-2 text-center text-sm font-bold">{data.examName}</p>

      <div className="flex items-start justify-between gap-3">
        <table className="flex-1 border-collapse text-[12px]">
          <tbody>
            <Cell k="শিক্ষার্থীর নাম / Name" v={st.nameBn || st.nameEn} />
            <Cell k="শিক্ষার্থী আইডি / ID" v={st.studentId} />
            <Cell k="শ্রেণি / Class" v={classLabel(st.classId, true)} />
            <Cell k="রোল / Roll" v={st.roll} />
            <Cell k="শিক্ষাবর্ষ / Session" v={st.sessionId} />
            <Cell k="পিতার নাম / Father" v={st.fatherName} />
            <Cell k="মাতার নাম / Mother" v={st.motherName} />
            <Cell k="জন্ম তারিখ / DOB" v={fmtDob(st.dateOfBirth)} />
            <Cell k="ঠিকানা / Address" v={st.address} />
          </tbody>
        </table>
        <div className="flex h-[120px] w-[96px] shrink-0 items-center justify-center border-2 border-black text-center text-[10px]">
          {st.photo ? (
            <img src={st.photo} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
          ) : (
            <span>ছবি</span>
          )}
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1 text-left">বিষয় / Subject</th>
            <th className="border border-black px-2 py-1">পূর্ণমান</th>
            <th className="border border-black px-2 py-1">প্রাপ্ত নম্বর</th>
            <th className="border border-black px-2 py-1">গ্রেড</th>
            <th className="border border-black px-2 py-1">জিপিএ</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((m) => (
            <tr key={m.name}>
              <td className="border border-black px-2 py-1">
                {m.name}
                {m.isOptional ? ' (ঐচ্ছিক)' : ''}
              </td>
              <td className="border border-black px-2 py-1 text-center">{m.fullMarks}</td>
              <td className="border border-black px-2 py-1 text-center font-semibold">
                {m.marks === null ? 'অনুপস্থিত' : m.marks}
              </td>
              <td className="border border-black px-2 py-1 text-center">{m.grade}</td>
              <td className="border border-black px-2 py-1 text-center">{m.gradePoint.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-black px-2 py-1">মোট / Total</td>
            <td className="border border-black px-2 py-1 text-center">{data.fullTotal}</td>
            <td className="border border-black px-2 py-1 text-center">{data.total}</td>
            <td className="border border-black px-2 py-1 text-center">{data.grade}</td>
            <td className="border border-black px-2 py-1 text-center">{data.gpa.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[13px] font-semibold">
        <span>শতকরা: {data.percentage.toFixed(2)}%</span>
        <span>
          ফলাফল:{' '}
          {data.passed ? (data.promoted ? 'বিবেচনায় উত্তীর্ণ (Promoted)' : 'উত্তীর্ণ (Pass)') : 'অনুত্তীর্ণ (Fail)'}
        </span>
      </div>

      <div className="mt-14 flex justify-between text-[12px]">
        <div className="w-40 border-t border-black pt-1 text-center">শ্রেণি শিক্ষক</div>
        <div className="w-40 border-t border-black pt-1 text-center">অভিভাবক</div>
        <div className="w-40 border-t border-black pt-1 text-center">প্রধান শিক্ষক</div>
      </div>
    </div>
  );
            }
