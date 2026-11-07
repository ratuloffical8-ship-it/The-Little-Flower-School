// src/utils/admissionForm.ts
/** One shape for the printable admission form, built from a student and/or its application. */
export interface AdmissionFormData {
  applicationId: string;
  studentId: string;
  sessionId: string;
  classId: string;
  roll: string;
  submittedAt: string;
  student: {
    nameBn: string;
    nameEn: string;
    dateOfBirth: string;
    gender: string;
    religion: string;
    nationality: string;
    bloodGroup: string;
    previousSchool: string;
    classApplyingFor: string;
  };
  guardian: {
    fatherName: string;
    motherName: string;
    guardianName: string;
    relationship: string;
    occupation: string;
    nid: string;
    mobile: string;
    email: string;
    presentAddress: string;
    permanentAddress: string;
    monthlyIncome: string;
  };
  photo: string;
}

type Bag = Record<string, unknown>;

/** First non-empty value as text. */
export const txt = (...vals: unknown[]): string => {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const bag = (v: unknown): Bag => (v && typeof v === 'object' ? (v as Bag) : {});

function docUrl(v: unknown): string {
  if (typeof v === 'string') return v;
  const o = bag(v);
  return txt(o.url, o.path);
}

export function buildAdmissionForm(student?: Bag | null, application?: Bag | null): AdmissionFormData {
  const s = bag(student);
  const a = bag(application);
  const as = bag(a.student);
  const ag = bag(a.guardian);
  const sg = bag(s.guardian);
  const docs = bag(a.documents);

  return {
    applicationId: txt(a.applicationId, s.applicationId),
    studentId: txt(s.studentId),
    sessionId: txt(s.sessionId, a.sessionId),
    classId: txt(s.classId, as.classApplyingFor, a.classApplyingFor),
    roll: txt(s.roll),
    submittedAt: txt(a.createdAt, s.createdAt),
    student: {
      nameBn: txt(as.nameBn, s.nameBn, s.name),
      nameEn: txt(as.nameEn, s.nameEn),
      dateOfBirth: txt(as.dateOfBirth, as.dob, s.dateOfBirth),
      gender: txt(as.gender, s.gender),
      religion: txt(as.religion, s.religion),
      nationality: txt(as.nationality),
      bloodGroup: txt(as.bloodGroup, s.bloodGroup),
      previousSchool: txt(as.previousSchool),
      classApplyingFor: txt(as.classApplyingFor, s.classId),
    },
    guardian: {
      fatherName: txt(ag.fatherName, sg.fatherName),
      motherName: txt(ag.motherName, sg.motherName),
      guardianName: txt(ag.guardianName, sg.guardianName, sg.name),
      relationship: txt(ag.relationship, ag.relation, sg.relation),
      occupation: txt(ag.occupation),
      nid: txt(ag.nid, sg.nid),
      mobile: txt(ag.mobile, sg.mobile),
      email: txt(ag.email, sg.email),
      presentAddress: txt(ag.presentAddress, sg.presentAddress, sg.address),
      permanentAddress: txt(ag.permanentAddress, sg.permanentAddress),
      monthlyIncome: txt(ag.monthlyIncome),
    },
    photo: txt(docUrl(docs.photo), s.photo),
  };
  }
