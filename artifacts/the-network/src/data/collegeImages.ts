const COLLEGE_IMAGE_MAP: Record<string, string> = {
  // --- Colleges with real users on platform (real campus photos) ---
  'NIT Tiruchirappalli':
    'https://image-static.collegedunia.com/public/reviewPhotos/1137348/1000028837.jpg',
  'IIT Madras':
    'https://image-static.collegedunia.com/public/dashboard_upload/1770381230_hsb.jpeg',
  'NIT Durgapur':
    'https://image-static.collegedunia.com/public/dashboard_upload/1770043706_IMG-20251107-WA0055-Abhay.jpg',
  'IIT Delhi':
    'https://static.toiimg.com/thumb/msid-127642279,imgsize-61452,width-400,height-225,resizemode-72/building-upwards-iit-delhi-plans-to-rebuild-entire-campus-by-2035.jpg',
  'NIT Silchar':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/176431220725399_college%20building%20(6).webp',
  'Dr. B.R. Ambedkar NIT Jalandhar':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1435385020Dr.B.R.Ambedker%204.jpg',
  'IIIT Allahabad':
    'https://image-static.collegedunia.com/public/reviewPhotos/958319/1000023346.jpg',
  'Central University':
    'https://daqwpj7vq235r.cloudfront.net/images/mba/central-university-of-rajasthan-campus-building-2.webp',
  'IIT Indore':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1489732523c16.jpg',
  'NIT Surathkal':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1767357175ab%202.jpg',
  'NIT Sikkim':
    'https://ugcounselor-content.s3.ap-south-1.amazonaws.com/wp-content/uploads/2024/06/08164917/NIT-Sikkim.jpg',
  'MNIT Jaipur':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1462450901department.jpg',
  'NIT Manipur':
    'https://image-static.collegedunia.com/public/reviewPhotos/424817/nit.jpg',
  'SRM Institute':
    'https://www.collegebatch.com/static/clg-gallery/srm-university-kattankulathur-campus-kanchipuram-239480.webp',
  'IIT Hyderabad':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/25356_Building5.webp',
  'MANIT Bhopal':
    'https://static.boostmytalent.com/img/univ/nit-bhopal-manit-bhopal-campus-admission.webp',
  'IIT Bombay':
    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Main_building_in_IIT_Bombay.jpg',
  'VNIT Nagpur':
    'https://image-static.collegedunia.com/public/reviewPhotos/1137189/8860.jpg',
  'IIT (BHU) Varanasi':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/14354052622.jpg',
  'IIT Roorkee':
    'https://daqwpj7vq235r.cloudfront.net/images/mba-institute/iit-roorkee-indian-institute-of-technology-campus-building-area.jpeg',
  'IIT DHOLAKPUR':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/25666_college%20building.webp',
  'The Network':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1459921838adminbuildingnitap%20-%20Copy.jpg',

  // --- Other major colleges (for onboarding / search) ---
  'IIT Kanpur':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480670683GateIITK1.jpg',
  'IIT Kharagpur':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1531985408img_20161204_091525_hdr.jpg',
  'IIT Guwahati':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480583813lecture_hall_complex_iitg.jpg',
  'IIT (ISM) Dhanbad':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1467620702MainBuilding.jpg',
  'IIT Gandhinagar':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1504175489New%20Campus.jpg',
  'IIT Patna':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1510212449iitp-admin.jpg',
  'IIT Jodhpur':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1527232065img_0375.jpg',
  'NIT Warangal':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480492219administrative_building.jpg',
  'NIT Rourkela':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1521533447admin.jpg',
  'NIT Calicut':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1478847563admin_building.jpg',
  'BITS Pilani':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578186bits_pilani.jpg',
  'VIT Vellore':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1498711259Main%20block.jpg',
  'Manipal Institute of Technology':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480575108Main%20Gate.jpg',
  'AIIMS New Delhi':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1481000002aiims_building.jpg',
  'IIM Ahmedabad':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578497IIMA.jpg',
  'IIM Bangalore':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578530IIM%20Bangalore.jpg',
  'IIM Calcutta':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578560iimc.jpg',
  'Delhi University':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480583760DU_North_Campus.jpg',
  'Jawaharlal Nehru University':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480583837jnu.jpg',
  'Ashoka University':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1568792923760.jpg',
  'IIIT Hyderabad':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1567448400815.jpg',
  'IIIT Delhi':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1607237138185.jpg',
  'IIIT Bangalore':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578614IIITB.jpg',
  'MNNIT Prayagraj':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480584081mnnit.jpg',
  'SVNIT Surat':
    'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480584120svnit.jpg',
};

const FALLBACK_IMAGES = [
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480670683GateIITK1.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1531985408img_20161204_091525_hdr.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480583813lecture_hall_complex_iitg.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1467620702MainBuilding.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480492219administrative_building.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1521533447admin.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1478847563admin_building.jpg',
  'https://image-static.collegedunia.com/public/college_data/images/campusimage/1480578186bits_pilani.jpg',
];

export function getCollegeImage(name: string): string {
  if (COLLEGE_IMAGE_MAP[name]) return COLLEGE_IMAGE_MAP[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}
