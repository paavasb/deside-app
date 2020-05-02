import database from '../firebase/firebase';
import * as firebase from 'firebase';
import { startAddAnsweredQuestion } from './answered';

export const addQuestion = (question) => ({
    type: 'ADD_QUESTION',
    question
})

export const startAddQuestion = (dispatch, questionData) => {
    return database.ref(`all-questions`).push(questionData).then((ref) => {
        dispatch(addQuestion({
            refID: ref.key,
            ...questionData
        }))
    })
}

export const setQuestions = (questions) => ({
    type: 'SET_QUESTIONS',
    questions
 })

export const startSetQuestion = (dispatch) => {
    return database.ref(`all-questions`).once('value').then((snapshot) => {
        const questions = []
        snapshot.forEach((childSnapshot) => {
            questions.push({
                refID: childSnapshot.key,
                ...childSnapshot.val()
            })
        })
        dispatch(setQuestions(questions))
    })
}

export const removeQuestion = ({ id } = {}) => ({
    type: 'REMOVE_QUESTION',
    id
})

export const startRemoveQuestion = (dispatch, refID, id, creator) => {
    if(creator === firebase.auth().currentUser.uid) {
        return database.ref(`all-questions/${refID}`).remove().then(() => {
            dispatch(removeQuestion({ id }))
        })
    }
}

export const voteQuestion = (id, updates) => ({
    type: 'VOTE_QUESTION',
    id,
    updates
})

export const startVoteQuestion = (dispatch, answeredDispatch, refID, id, updates, optionText, userID) => {
    return database.ref(`all-questions/${refID}/options`).update(updates).then(() => {
        database.ref(`users-answers/${userID}`).push({ questionRefID: refID, optionText })
        startAddAnsweredQuestion(answeredDispatch, refID)
        dispatch(voteQuestion(id, updates))
    })
}

export const addVoted = (question, updates, optionText, dispatch, answeredDispatch) => {
    const uid = firebase.auth().currentUser.uid
    let answered = false
    let answeredOptionText = ''
    return database.ref(`users-answers/${uid}`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().questionRefID === question.refID) {
                answered = true
                answeredOptionText = childSnapshot.val().optionText
            }
        })
        if(!answered) {
            startVoteQuestion(dispatch, answeredDispatch, question.refID, question.id, updates, optionText, uid)
        }
        return answeredOptionText
    })
}

export const checkVoted = (question) => {
    const uid = firebase.auth().currentUser.uid
    let answeredOptionText = ''
    return database.ref(`users-answers/${uid}`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().questionRefID === question.refID) {
                answeredOptionText = childSnapshot.val().optionText
                return
            }
        })
        return answeredOptionText
    })
}

export const checkVotedPromise = (question) => new Promise((resolve, reject) => {
    console.log('In Promise')   
    setTimeout(() => {
            const someStr = checkVoted(question) //'rand'
            resolve(someStr)
            //resolve(checkVoted(question))
        }, 5000)
})



// StartVoteQuestion method before addVoted was added
// export const startVoteQuestion = (dispatch, refID, id, updates) => {
//     return database.ref(`all-questions/${refID}/options`).update(updates).then(() => {
//         database
//         dispatch(voteQuestion(id, updates))
//     })
// }

//startAddQuestion method for database structure with seperate user questions
// export const startAddQuestion = (dispatch, questionData) => {
//     return database.ref(`all-questions`).push(questionData).then((ref) => {
//         database.ref(`users/${questionData.creator}/questions`).push(questionData).then((ref2) => {
//             console.log(ref.key)
//             dispatch(addQuestion({
//                 refID: ref.key,
//                 ...questionData
//             }))
//         })
//     })
// }

// export const setQuestions = (dispatch, questions) => {
//     dispatch({
//         type: 'SET_QUESTIONS',
//         questions
//     })
// }

// return database.ref(`users/${uid}/questions`).push(question).then((ref)=> {
//     console.log('Hey');
//     database.ref(`all-questions`).push(question).then((ref) => {
//         dispatch(addQuestion({
//             id: ref.key,
//             ...question
//         }));
//         console.log(question);
//     })
// });

// export const startAddQuestion = (questionData = {}) => {
//     console.log('Yo');
//     return (dispatch, getState) => {
//         console.log('YoYp');
//         //const uid = getState().auth.uid;
//         const {
//             questionText = '', 
//             options = [],
//             tags = [], 
//             createdAt = 0,
//         } = questionData;
//         const question = { questionText, options, tags, createdAt, creator: '123' };
//         return database.ref(`all-questions`).push(question).then((ref)=> {
//             console.log('Hey');
//             dispatch(addQuestion({
//                 id: ref.key,
//                 ...question
//             }));
//         });
//     };
// };