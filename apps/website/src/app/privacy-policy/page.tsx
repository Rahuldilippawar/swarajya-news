import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "गोपनीयता धोरण",
  description: "Privacy Policy of Swarajya News: what the website, Android app and WhatsApp bulletin collect and why.",
  alternates: { canonical: "/privacy-policy" },
};

// Describes what the platform actually does (see docs/SECURITY.md). Management must review and approve the text
// before launch, and it must be updated whenever data handling changes. The Android app links here.
export default function Page() {
  return (
    <article className="prose">
      <h1>गोपनीयता धोरण</h1>
      <p>शेवटचा बदल: १७ ऑक्टोबर २०२६</p>
      <p>
        स्वराज्य न्यूज (Swarajya News) वेबसाइट, Android ॲप आणि WhatsApp बातमीपत्र वापरताना कोणती माहिती हाताळली जाते,
        का आणि तुमचे अधिकार काय आहेत, हे या धोरणात सांगितले आहे.
      </p>

      <h2>वाचकांसाठी: खाते नाही</h2>
      <p>बातम्या वाचण्यासाठी किंवा पाहण्यासाठी खाते, लॉगिन, नाव किंवा फोन नंबर लागत नाही.</p>

      <h2>आपोआप हाताळली जाणारी माहिती</h2>
      <ul>
        <li>
          <strong>वाचनसंख्या आणि जाहिरात संख्या:</strong> बातमी किती वेळा वाचली गेली आणि जाहिरात किती वेळा दिसली किंवा
          उघडली गेली, याची फक्त एकूण संख्या ठेवली जाते. ती कोणत्याही व्यक्तीशी जोडली जात नाही.
        </li>
        <li>
          <strong>IP पत्ता:</strong> संख्या कृत्रिमरीत्या वाढवण्याचा गैरवापर रोखण्यासाठी तो काही क्षणांसाठी वापरला जातो
          आणि आमच्या डेटाबेसमध्ये साठवला जात नाही.
        </li>
        <li>
          <strong>तांत्रिक नोंदी:</strong> आमची सेवा Google Firebase / Google Cloud वर चालते. सेवा सुरक्षित व चालू
          ठेवण्यासाठी ते नेहमीच्या तांत्रिक नोंदी (logs) ठेवतात.
        </li>
        <li>आम्ही कोणतेही analytics किंवा जाहिरात-ट्रॅकिंग साधन वापरत नाही आणि वाचकांचे प्रोफाइल तयार करत नाही.</li>
      </ul>

      <h2>Android ॲप</h2>
      <ul>
        <li>जतन केलेल्या बातम्या आणि सूचना सेटिंग्ज फक्त तुमच्या फोनवर साठवल्या जातात.</li>
        <li>
          <strong>सूचना (notifications):</strong> Firebase Cloud Messaging द्वारे पाठवल्या जातात. त्यासाठी तुमच्या फोनला
          एक तांत्रिक ओळख (token) मिळते. तुम्ही निवडलेल्या विषयांनुसार (सर्व बातम्या, निवडलेले जिल्हे) सूचना येतात; आम्ही
          ही ओळख तुमच्या नावाशी किंवा नंबरशी जोडत नाही. फोनच्या सेटिंग्जमधून किंवा ॲपमधील «सूचना सेटिंग्ज» मधून त्या
          कधीही बंद करता येतात.
        </li>
      </ul>

      <h2>YouTube व्हिडिओ</h2>
      <p>
        व्हिडिओ आमच्या अधिकृत YouTube चॅनेलवरून दाखवले जातात आणि तुम्ही प्ले केल्यावरच YouTube प्लेअर लोड होतो (वेबसाइटवर
        YouTube चा privacy-enhanced mode). व्हिडिओ पाहताना{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google चे गोपनीयता धोरण</a>{" "}
        लागू होते.
      </p>

      <h2>WhatsApp बातमीपत्र</h2>
      <ul>
        <li>तुम्ही संमती दिल्यावरच तुमचा नंबर बातमीपत्र यादीत जोडला जातो.</li>
        <li>आम्ही तुमचा WhatsApp नंबर, नाव (दिल्यास), जिल्हा आणि संमती कधी व कशी दिली याची नोंद ठेवतो.</li>
        <li>
          कधीही <strong>STOP</strong> असे उत्तर पाठवून बातमीपत्र थांबवता येते; पुन्हा सुरू करण्यासाठी <strong>START</strong>{" "}
          पाठवा.
        </li>
        <li>
          संदेश Meta च्या WhatsApp Business सेवेमार्फत पाठवले जातात; त्यावर{" "}
          <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">WhatsApp चे धोरण</a>{" "}
          लागू होते.
        </li>
      </ul>

      <h2>जाहिराती</h2>
      <p>
        जाहिराती «जाहिरात» या लेबलसह दाखवल्या जातात. आम्ही जाहिरात नेटवर्क वापरत नाही आणि जाहिरातींसाठी तुमची वैयक्तिक
        माहिती वापरत नाही. जाहिरातीवर क्लिक केल्यावर जाहिरातदाराची वेबसाइट उघडते, जिथे त्यांचे धोरण लागू होते.
      </p>

      <h2>कर्मचारी आणि वार्ताहर</h2>
      <p>
        स्वराज्य न्यूजच्या कर्मचारी व वार्ताहरांची खाती व्यवस्थापनाकडून तयार केली जातात. त्यासाठी नाव, ईमेल, फोन, भूमिका आणि
        नेमलेले भाग ठेवले जातात, आणि सुरक्षेसाठी महत्त्वाच्या कृतींची नोंद ठेवली जाते.
      </p>

      <h2>माहिती कोणाला दिली जाते</h2>
      <p>
        आम्ही कोणतीही वैयक्तिक माहिती विकत नाही. सेवा चालवण्यासाठी Google (Firebase, YouTube) आणि Meta (WhatsApp) या सेवा
        वापरल्या जातात. कायद्याने बंधनकारक असल्यासच माहिती अधिकृत यंत्रणांना दिली जाते.
      </p>

      <h2>माहिती किती काळ ठेवली जाते</h2>
      <p>
        WhatsApp नोंदी तुम्ही सदस्य असेपर्यंत आणि संमतीचा पुरावा म्हणून आवश्यक असेपर्यंत ठेवल्या जातात. सुरक्षिततेसाठी
        डेटाबेसचे बॅकअप १४ आठवड्यांपर्यंत ठेवले जातात.
      </p>

      <h2>तुमचे अधिकार</h2>
      <p>
        डिजिटल वैयक्तिक डेटा संरक्षण कायदा, २०२३ नुसार तुम्ही तुमच्या माहितीची प्रत, दुरुस्ती किंवा ती हटवण्याची विनंती
        करू शकता, तसेच संमती मागे घेऊ शकता. त्यासाठी <Link href="/contact">संपर्क</Link> पृष्ठावरील तपशील वापरा.
      </p>

      <h2>मुले</h2>
      <p>ही सेवा सर्वसामान्य वाचकांसाठी आहे. आम्ही जाणीवपूर्वक मुलांची वैयक्तिक माहिती गोळा करत नाही.</p>

      <h2>बदल</h2>
      <p>या धोरणात बदल झाल्यास तो येथे प्रसिद्ध केला जाईल आणि वरील तारीख बदलली जाईल.</p>

      <h2 lang="en">Summary in English</h2>
      <p lang="en">
        Readers need no account. We keep only anonymous view and ad counts; IP addresses are used briefly to prevent abuse
        and are not stored. We use no analytics or ad tracking. The Android app stores saved stories and notification
        choices on the phone, and receives notifications through Firebase Cloud Messaging by topic. YouTube videos load
        only when played. WhatsApp bulletins are sent only with consent; we keep the number, optional name, district and
        consent record, and you can reply STOP at any time. We do not sell personal data. Our service providers are Google
        (Firebase, YouTube) and Meta (WhatsApp). To access, correct or delete your data, use the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </article>
  );
}
