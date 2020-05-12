import database from '../firebase/firebase'
import * as firebase from 'firebase'

export const setUserlist = (userlist) => ({
    type: 'SET_USERLIST',
    userlist
})

export const startSetUserlist = (userlistDispatch) => {
    return database.ref(`usernames`).once('value').then((snapshot) => {
        const userlist = []
        snapshot.forEach((childSnapshot) => {
            userlist.push({
                key: childSnapshot.key,
                value: childSnapshot.val()
            })
        })
        userlistDispatch(setUserlist(userlist))
        //Cleanup: console.log('Inside' , userlist)
        return userlist
    })
}