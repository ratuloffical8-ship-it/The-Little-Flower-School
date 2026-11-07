// src/components/AdmissionFormSheet.tsx
import type { AdmissionFormData } from '@/utils/admissionForm';
import { classLabel } from '@/utils/classes';
import SchoolSheetHeader from './SchoolSheetHeader';

const GENDER: Record<string, string> = { male: 'ছেলে / Male', female: 'মেয়ে / Female', other: 'অন্যান্য / Other' };

function fmtDob(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function fmtDate(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Row({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <tr>
      <td className="w-[32%] border border-black px-2 py-1.5 font-semibold align-top">{label}</td>
      <td className="border border-black px-2 py-1.5 align-top" colSpan={wide ? 3 : 1}>
        {value || ''}
      </td>
    </tr>
  );
}

/** Printable admission form (A4) with the passport photo at the top right. */
export default function AdmissionFormSheet({ data }: { data: AdmissionFormData }) {
  const s = data.student;
  const g = data.guardian;
  return (
    <div>
      <SchoolSheetHeader title="ভর্তি ফরম / Admission Form" />

      <div className="flex items-start justify-between gap-3">
        <table className="flex-1 border-collapse text-[12px]">
          <tbody>
            <Row label="আবেদন নম্বর / Application No" value={data.applicationId} />
            <Row label="শিক্ষার্থী আইডি / Student ID" value={data.studentId} />
            <Row label="শ্রেণি / Class" value={classLabel(data.classId || s.classApplyingFor, true)} />
            <Row label="রোল / Roll" value={data.roll} />
            <Row label="শিক্ষাবর্ষ / Session" value={data.sessionId} />
            <Row label="আবেদনের তারিখ / Date" value={fmtDate(data.submittedAt)} />
          </tbody>
        </table>
        <div className="flex h-[150px] w-[120px] shrink-0 items-center justify-center border-2 border-black text-center text-[10px]">
          {data.photo ? (
            <img src={data.photo} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
          ) : (
            <span>পাসপোর্ট সাইজ ছবি</span>
          )}
        </div>
      </div>

      <h3 className="mb-1 mt-4 bg-gray-200 px-2 py-1 text-sm font-bold">শিক্ষার্থীর তথ্য / Student information</h3>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <Row label="নাম (বাংলায়)" value={s.nameBn} wide />
          <Row label="Name (English)" value={s.nameEn} wide />
          <Row label="জন্ম তারিখ / Date of birth" value={fmtDob(s.dateOfBirth)} wide />
          <Row label="লিঙ্গ / Gender" value={GENDER[s.gender] ?? s.gender} wide />
          <Row label="ধর্ম / Religion" value={s.religion} wide />
          <Row label="জাতীয়তা / Nationality" value={s.nationality} wide />
          <Row label="রক্তের গ্রুপ / Blood group" value={s.bloodGroup} wide />
          <Row label="আগের স্কুল / Previous school" value={s.previousSchool} wide />
        </tbody>
      </table>

      <h3 className="mb-1 mt-4 bg-gray-200 px-2 py-1 text-sm font-bold">অভিভাবকের তথ্য / Guardian information</h3>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <Row label="পিতার নাম / Father" value={g.fatherName} wide />
          <Row label="মাতার নাম / Mother" value={g.motherName} wide />
          <Row label="অভিভাবকের নাম / Guardian" value={g.guardianName} wide />
          <Row label="সম্পর্ক / Relation" value={g.relationship} wide />
          <Row label="পেশা / Occupation" value={g.occupation} wide />
          <Row label="জাতীয় পরিচয়পত্র / NID" value={g.nid} wide />
          <Row label="মোবাইল / Mobile" value={g.mobile} wide />
          <Row label="ইমেইল / Email" value={g.email} wide />
          <Row label="মাসিক আয় / Monthly income" value={g.monthlyIncome} wide />
          <Row label="বর্তমান ঠিকানা / Present address" value={g.presentAddress} wide />
          <Row label="স্থায়ী ঠিকানা / Permanent address" value={g.permanentAddress} wide />
        </tbody>
      </table>

      <p className="mt-4 text-[11px]">
        আমি এই মর্মে ঘোষণা করছি যে উপরের সকল তথ্য সত্য এবং স্কুলের নিয়মকানুন মেনে চলতে সম্মত আছি। / I declare that
        the above information is true and I agree to follow the school rules.
      </p>

      <div className="mt-12 flex justify-between text-[12px]">
        <div className="w-44 border-t border-black pt-1 text-center">অভিভাবকের স্বাক্ষর</div>
        <div className="w-44 border-t border-black pt-1 text-center">অধ্যক্ষ / প্রধান শিক্ষকের স্বাক্ষর</div>
      </div>
    </div>
  );
                                     }
