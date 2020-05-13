import React from 'react'
import database from '../firebase/firebase'
import * as firebase from 'firebase'

export const getUsername = (userID) => {
    let username = ''
    return database.ref(`usernames/${userID}`).once('value').then((snapshot) => {
        //console.log('Snap', snapshot.val())
        username = snapshot.val()
        return username
    })
    //console.log('UserID' , userID)
    //console.log('UserName', username)
    
}

export const getUsernames = async (userIDs) => {
    let usernames = []
    for(const userID of userIDs) {
        const username = await getUsername(userID)
        usernames.push(username)
    }
    //Cleanup: console.log('Usernames: ', usernames)
    return usernames
}

export const checkFollow = (following, followers, id) => {
    let followStatus = ''
    following.forEach((follow) => {
        if(follow === id) {
            followStatus = 'Following'
        }
    })
    if(!followStatus) {
        followers.forEach((follower) => {
            if(follower === id) {
                followStatus = 'Follower'
            }
        })
    }
    return followStatus
}

export const checkFollowingBack = (following, id) => {
    let followingBack = false
    following.forEach((follow) => {
        if(follow === id) {
            followingBack = true
            return
        }
    })
    return followingBack
}

export const checkFollowFollowingStatus = (following, followers, id) => {
    let followingStatus = false
    let followerStatus = false
    following.forEach((follow) => {
        if(follow === id) {
            followingStatus = true
            return
        }
    })
    followers.forEach((follower) => {
        if(follower === id) {
            followerStatus = true
            return
        }
    })
    //Cleanup: console.log('Check Method', followingStatus, followerStatus)
    return { followingStatus, followerStatus } 
}

export const calculateUserScore = (user) => {
    let score = 0
    score = (user.questions.length * 20) + (user.answered.length) + (user.followers.length * 30) + (user.following.length * 10)
    return score
}
// export const getUsernames = async (userIDs) => {
//     let usernames = []
//     await userIDs.forEach(async (userID) => {
//         const username = await getUsername(userID)
//         console.log('Username: ', username)
//         usernames.push(username)
//     })
//     console.log('Usernames: ', usernames)
//     return usernames
// }

// export const getUsername = async (userID) => {
//     let username = ''
//     await database.ref(`usernames/${userID}`).once('value').then((snapshot) => {
//         username = snapshot.val()
//     })
//     return username
// }