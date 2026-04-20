export type Language = 'kinyarwanda' | 'english' | 'french' | 'kiswahili';

export interface SmsTemplateData {
  patientName: string;
  pharmacyName: string;
  medicineName: string;
  doseNumber: number;
  totalDoses: number;
  exactTime: string;
  supportNumber: string;
}

export function buildSmsMessage(language: Language, data: SmsTemplateData): string {
  const { patientName, pharmacyName, medicineName, doseNumber, totalDoses, exactTime, supportNumber } = data;

  switch (language) {
    case 'kinyarwanda':
      return (
        `Muraho ${patientName},\n\n` +
        `Ubutumwa buva kuri ${pharmacyName}.\n\n` +
        `Ni igihe cyo gufata imiti yawe:\n` +
        `💊 ${medicineName}\n` +
        `🕐 Igipimo ${doseNumber} muri ${totalDoses} — saa ${exactTime}\n\n` +
        `Nyamuneka fata imiti yawe ubu!\n\n` +
        `📞 Inomero y'ubufasha: ${supportNumber}\n\n` +
        `Murakoze. ${pharmacyName}.`
      );

    case 'english':
      return (
        `Hello ${patientName},\n\n` +
        `This is a reminder from ${pharmacyName}.\n\n` +
        `It's time to take your medication:\n` +
        `💊 ${medicineName}\n` +
        `🕐 Dose ${doseNumber} of ${totalDoses} — at ${exactTime}\n\n` +
        `Please take your medication now!\n\n` +
        `📞 Support: ${supportNumber}\n\n` +
        `Thank you. ${pharmacyName}.`
      );

    case 'french':
      return (
        `Bonjour ${patientName},\n\n` +
        `Rappel de la part de ${pharmacyName}.\n\n` +
        `Il est l'heure de prendre votre médicament :\n` +
        `💊 ${medicineName}\n` +
        `🕐 Dose ${doseNumber} sur ${totalDoses} — à ${exactTime}\n\n` +
        `Veuillez prendre votre médicament maintenant !\n\n` +
        `📞 Support : ${supportNumber}\n\n` +
        `Merci. ${pharmacyName}.`
      );

    case 'kiswahili':
      return (
        `Habari ${patientName},\n\n` +
        `Ujumbe kutoka ${pharmacyName}.\n\n` +
        `Ni wakati wa kuchukua dawa yako:\n` +
        `💊 ${medicineName}\n` +
        `🕐 Dozi ${doseNumber} kati ya ${totalDoses} — saa ${exactTime}\n\n` +
        `Tafadhali chukua dawa yako sasa!\n\n` +
        `📞 Msaada: ${supportNumber}\n\n` +
        `Asante. ${pharmacyName}.`
      );

    default:
      return buildSmsMessage('english', data);
  }
}