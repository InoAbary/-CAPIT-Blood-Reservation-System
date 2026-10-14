// formAnswers.cjs
const mongoose = require('mongoose')

// Questions 34 and 37 collect only a date; all others collect yes/no + remarks
const DATE_ONLY_QUESTIONS = [34, 37]

const answerSchema = new mongoose.Schema({
    qId:     { type: Number, required: true, min: 1, max: 37 },
    result:  { type: Boolean },   // true = yes, false = no (undefined for date-only qs)
    remarks: { type: String, trim: true },
    date:    { type: Date }       // only used by q34 and q37
}, { _id: false })

const formAnswerSchema = new mongoose.Schema({

    // Link back to the parent Form_Details document
    formDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form_Details',
        required: true,
        index: true
    },

    answers: {
        type: [answerSchema],
        validate: {
            validator: (arr) => arr.length === 37,
            message: 'Expected 37 answers, got {VALUE}.'
        }
    }

}, { timestamps: true })

module.exports = mongoose.model('Form_Answers', formAnswerSchema)