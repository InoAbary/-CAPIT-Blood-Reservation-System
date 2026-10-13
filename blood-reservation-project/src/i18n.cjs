import i18n from 'i18next';
import {initReactI18next} from 'react-i18next'

import en from './locales/en/en.json'
import fil from './locales/fil/fil.json'

i18n
.use(initReactI18next)
.init({
    resources: {
        en: {translation: en },
        fil: { translation: fil }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {escapeValue: false}
})

export default i18n;
