import database from '../firebase/firebase'
import { checkFollowFollowingStatus } from './helperActions'

export const setOtheruser = (otheruser) => ({
    type: 'SET_OTHERUSER',
    otheruser
})

export const startSetOtheruser = (otheruser, otheruserDispatch) => {
    otheruserDispatch(setOtheruser(otheruser))
}

export const setFollowStatus = (followStatus) => ({
    type: 'SET_FOLLOWSTATUS',
    followStatus
}) 

export const startSetFollowStatus = (followStatus, otheruserDispatch) => {
    otheruserDispatch(setFollowStatus(followStatus))
}

export const getOtheruser = (otheruser) => ({
    type: 'GET_OTHERUSER',
    otheruser
})

//TODO: Get questions, followers, following too
export const startGetOtheruser = (otheruserID, otheruserDispatch) => {
    return database.ref(`users/${otheruserID}`).once('value').then((snapshot) => {
        const userID = otheruserID
        const username = snapshot.val().username
        const followStatus = {}
        const otheruser = {
            userID,
            username,
            followStatus
        }
        otheruserDispatch(getOtheruser(otheruser))
    })
}

// return database.ref(`users/${otheruserID}`).once('value').then((snapshot) => {
//     const val = snapshot.val()
//     const userID = val.userID
//     const username = val.username
//     //TODO: Decide whether to show answered or not
//     //const answered = []
//     //TODO: Implement showing followers and following when user follows
//     //const followers = []
//     //const following = []
//     //TODO: Get all the questions of the user 
//     //const questions = []

//     const otheruser = {
//         userID,
//         username
//     }

//     otheruserDispatch(setOtheruser(otheruser))
// })