import React from 'react'
import database from '../firebase/firebase'
import * as firebase from 'firebase'

export const getUsername = async (userID) => {
    let username = ''
    await database.ref(`usernames/${userID}`).once('value').then((snapshot) => {
        //console.log('Snap', snapshot.val())
        username = snapshot.val()
    })
    //console.log('UserID' , userID)
    //console.log('UserName', username)
    return username
}