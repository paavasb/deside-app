import database from '../firebase/firebase';
import * as firebase from 'firebase';
import { startAddAnsweredQuestion } from './answered';
import { startAddUserQuestion, startRemoveUserQuestion, startAddAnswered } from './user';

export const addQuestion = (question) => ({
    type: 'ADD_QUESTION',
    question
})

export const startAddQuestion = (dispatch, questionData, userDispatch, userID) => {
    return database.ref(`all-questions`).push(questionData).then((ref) => {
        startAddUserQuestion(userDispatch, userID, ref.key).then(() => {
            dispatch(addQuestion({
                refID: ref.key,
                ...questionData
            }))
        })
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

export const startRemoveQuestion = (dispatch, refID, id, creator, userDispatch) => {
    if(creator === firebase.auth().currentUser.uid) {
        return database.ref(`all-questions/${refID}`).remove().then(() => {
            startRemoveUserQuestion(userDispatch, creator, refID).then(() => {
                dispatch(removeQuestion({ id }))
            })
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
        //database.ref(`users/${userID}/answered`).push({ questionRefID: refID, optionText })
        //database.ref(`users-answers/${userID}`).push({ questionRefID: refID, optionText })
        startAddAnsweredQuestion(answeredDispatch, refID)
        dispatch(voteQuestion(id, updates))
    })
}

export const addVoted = (question, updates, optionText, dispatch, answeredDispatch, userDispatch) => {
    const uid = firebase.auth().currentUser.uid
    let answered = false
    let answeredOptionText = ''
    // return database.ref(`users-answers/${uid}`).once('value').then((snapshot) => {
    return database.ref(`users/${uid}/answered`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().questionRefID === question.refID) {
                answered = true
                answeredOptionText = childSnapshot.val().optionText
            }
        })
        if(!answered) {
            startVoteQuestion(dispatch, answeredDispatch, question.refID, question.id, updates, optionText, uid)
            startAddAnswered(userDispatch, uid, { questionRefID: question.refID, optionText })
        }
        return answeredOptionText
    })
}

export const checkVoted = (question) => {
    const uid = firebase.auth().currentUser.uid
    let answeredOptionText = ''
    // return database.ref(`users-answers/${uid}`).once('value').then((snapshot) => {
    return database.ref(`users/${uid}/answered`).once('value').then((snapshot) => {
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

export const changeAnonymous = (id, anonymous) => ({
    type: 'CHANGE_ANONYMOUS',
    id,
    anonymous
})

export const startChangeAnonymous = (dispatch, refID, id, anonymous) => {
    return database.ref(`all-questions/${refID}/anonymous`).set(anonymous).then(() => {
        dispatch(changeAnonymous(id, anonymous))
    })
}

export const changePrivacy = (id, priv) => ({
    type: 'CHANGE_PRIVACY',
    id,
    priv
})

export const startChangePrivacy = (dispatch, refID, id, priv) => {
    return database.ref(`all-questions/${refID}/priv`).set(priv).then(() => {
        dispatch(changePrivacy(id, priv))
    })
}

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