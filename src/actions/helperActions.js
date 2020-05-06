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
    console.log('Usernames: ', usernames)
    return usernames
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