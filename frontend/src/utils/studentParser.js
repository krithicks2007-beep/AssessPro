/**
 * AssessPro BIT Email Parser & Department/Year Predictor
 * Bannari Amman Institute of Technology (@bitsathy.ac.in)
 */

export const DEPARTMENT_MAP = {
  cs: 'Computer Science and Engineering',
  it: 'Information Technology',
  ad: 'Artificial Intelligence and Data Science',
  al: 'Artificial Intelligence and Machine Learning',
  cb: 'Computer Science and Business Systems',
  cd: 'Computer Science and Design',
  ct: 'Computer Technology',
  ec: 'Electronics and Communication Engineering',
  ee: 'Electrical and Electronics Engineering',
  ei: 'Electronics and Instrumentation Engineering',
  me: 'Mechanical Engineering',
  mz: 'Mechatronics Engineering',
  mt: 'Mechatronics Engineering',
  mc: 'Mechatronics Engineering',
  au: 'Automobile Engineering',
  ce: 'Civil Engineering',
  bt: 'Biotechnology',
  bm: 'Biomedical Engineering',
  ag: 'Agricultural Engineering',
  ft: 'Food Technology',
  tt: 'Textile Technology',
  fd: 'Fashion Technology',
  is: 'Information Science and Engineering'
};

/**
 * Predicts student department, academic year, and name from official email
 * Format: <name>.<dept><batch>@bitsathy.ac.in (e.g. krithickrajs.cs25@bitsathy.ac.in)
 */
export const parseBitEmail = (email = '') => {
  if (!email) return null;
  const clean = email.trim().toLowerCase();

  const match = clean.match(/^([a-z0-9._]+)\.([a-z]{2,3})(\d{2})@bitsathy\.ac\.in$/i);

  if (!match) {
    return {
      isStudent: false,
      name: clean.split('@')[0],
      deptCode: '',
      department: 'Faculty / Administration',
      batchNum: '',
      academicYear: 'Staff',
      predictedRegNo: ''
    };
  }

  const rawName = match[1];
  const deptCode = match[2].toLowerCase();
  const batchNum = match[3];

  const department = DEPARTMENT_MAP[deptCode] || `${deptCode.toUpperCase()} Engineering`;

  // Academic year based on batch number:
  // 26 -> I Year (First Year)
  // 25 -> II Year (Second Year)
  // 24 -> III Year (Third Year)
  // 23 -> IV Year (Final Year)
  let academicYear = 'II Year';
  if (batchNum === '26') academicYear = 'I Year (First Year)';
  else if (batchNum === '25') academicYear = 'II Year (Second Year)';
  else if (batchNum === '24') academicYear = 'III Year (Third Year)';
  else if (batchNum === '23') academicYear = 'IV Year (Final Year)';
  else academicYear = `Batch 20${batchNum}`;

  // Format capitalized name from email prefix
  const formattedName = rawName
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return {
    isStudent: true,
    rawName,
    formattedName,
    deptCode,
    department,
    batchNum,
    academicYear,
    predictedRegNo: `7376${batchNum}1${deptCode.toUpperCase()}101`
  };
};

/**
 * Master Admin Email: krithickrajs.cs25@bitsathy.ac.in
 * Keeps the master control dashboard to handle students, faculty, and admin views.
 */
export const MASTER_ADMIN_EMAIL = 'krithickrajs.cs25@bitsathy.ac.in';

export const isMasterAccount = (email = '') => {
  return (email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
};
