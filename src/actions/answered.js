import database from '../firebase/firebase';
import * as firebase from 'firebase';

export const addAnsweredQuestion = (answered_question) => ({
    type: 'ADD_ANSWERED_QUESTION',
    answered_question
})

export const startAddAnsweredQuestion = (answeredDispatch, answered_question) => {
    answeredDispatch(addAnsweredQuestion(answered_question))
}

export const setAnsweredQuestions = (answered_questions) => ({
    type: 'SET_QUESTIONS_ANSWERED',
    answered_questions
})

export const startSetAnsweredQuestions = (answeredDispatch) => {
    const uid = firebase.auth().currentUser.uid
    return database.ref(`users/${uid}/answered`).once('value').then((snapshot) => {
        const answered_questions = []
        snapshot.forEach((childSnapshot) => {
            answered_questions.push(childSnapshot.val().questionRefID)
        })
        answeredDispatch(setAnsweredQuestions(answered_questions))
    })
}