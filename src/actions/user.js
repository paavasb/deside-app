import database from '../firebase/firebase'
import * as firebase from 'firebase'
import uuid from  'uuid'

export const setUser = (user) => ({
    type: 'SET_USER',
    user
})

export const startSetUser = (userDispatch) => {
    const userID = firebase.auth().currentUser.uid
    database.ref(`users/${userID}`).once('value').then((snapshot) => {
        console.log('Snapshot', snapshot.val())
        let user = {}
        if(snapshot.val() === null) {
            user = {
                userID,
                username: uuid.v4().substr(0, 10),
                questions: [],
                following: [],
                followers: [],
                answered: []
            }
            database.ref(`users/${userID}`).set(user).then(() => {
                database.ref(`usernames/${userID}`).set(user.username).then(() => {
                    userDispatch(setUser(user))
                    startAddFollowing(userDispatch, userID, 'ljDIAZMRDdfVmX3VAxOSVV4GMOu1')
                })
            })
        } else {
            const username = snapshot.val().username
            const questions = []
            if(snapshot.val().questions !== undefined) {
                //console.log('Q', snapshot.val().questions)
                Object.entries(snapshot.val().questions).forEach(([key, value]) => 
                    questions.push(value.questionRefID))
                // snapshot.val().questions.forEach((question) => {
                //     questions.push(question.questionRefID)
                // })
            }
            const following = []
            if(snapshot.val().following !==  undefined) {
                Object.entries(snapshot.val().following).forEach(([key, value]) => 
                    following.push(value.followingID))
                // snapshot.val().following.forEach((follow) => {
                //     following.push(follow.followingID)
                // })
            }
            const followers = []
            if(snapshot.val().followers !==  undefined) {
                Object.entries(snapshot.val().followers).forEach(([key, value]) => 
                    followers.push(value.followerID))
            }
            const answered = []
            if(snapshot.val().answered !== undefined) {
                Object.entries(snapshot.val().answered).forEach(([key, value]) => 
                    answered.push({questionRefID: value.questionRefID, optionText: value.optionText}))
                // snapshot.val().answered.forEach((answeredIDs) => {
                //     answered.push(answeredIDs.answeredID)
                // })
            }
            user = {
                userID,
                username,
                questions,
                following,
                followers,
                answered
            }
            userDispatch(setUser(user))
        }
    })
}

export const setUserID = (userID) => ({
    type: 'SET_USERID',
    userID
})

export const startSetUserID = (userDispatch) => {
    const userID = firebase.auth().currentUser.uid
    userDispatch(userID)
}

export const setUsername = (username) => ({
    type: 'SET_USERNAME',
    username
})

export const startSetUsername = (userDispatch, user, username) => {
    return database.ref(`usernames`).once('value').then((snapshot) => {
        let usernameExists = false
        let currentUsernameKey = ''
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val() === username) {
                usernameExists = true
                console.log('Exists')
            }
            // if(childSnapshot.val().username === user.username) {
            //     currentUsernameKey = childSnapshot.key
            //     console.log(currentUsernameKey)
            // }
        })
        if(!usernameExists) {
            //console.log(database.ref(`usernames/${currentUsernameKey}`).once('value'))
            if (!!currentUsernameKey) {
                database.ref(`users/${user.userID}/username`).set(username).then(() => {
                    database.ref(`usernames/${user.userID}`).set(username).then(() => {
                        userDispatch(setUsername(username))
                        console.log('Username change successful')
                    })
                })
            } else {
                database.ref(`users/${user.userID}/username`).set(username).then(() => {
                    database.ref(`usernames/${user.userID}`).set(username).then((ref) => {
                        userDispatch(setUsername(username))
                        console.log('Username change successful')
                    })
                })
            }
        } else {
            console.log('Username change unsuccessful')
        }
    })
}

export const addUserQuestion = (question) => ({
    type: 'ADD_USER_QUESTION',
    question
})

export const startAddUserQuestion = (userDispatch, userID, questionRefID) => {
    return database.ref(`users/${userID}/questions`).push({ questionRefID }).then((ref) => {
        userDispatch(addUserQuestion(questionRefID))
    })
}

export const removeUserQuestion = (question) => ({
    type: 'REMOVE_USER_QUESTION',
    question
})

export const startRemoveUserQuestion = (userDispatch, userID, questionRefID) => {
    console.log('INSIDE')
    let questionStoreRefID = ''
    return database.ref(`users/${userID}/questions`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().questionRefID === questionRefID) {
                questionStoreRefID = childSnapshot.key
                console.log(childSnapshot.key)
                return
            }
        })
        database.ref(`users/${userID}/questions/${questionStoreRefID}`).remove().then(() => {
            console.log(questionStoreRefID)
            userDispatch(removeUserQuestion(questionRefID))
        })
    })
}

export const setUserQuestions = (questions) => ({
    type: 'SET_USER_QUESTIONS',
    questions
})

export const startSetUserQuestions = (userDispatch, userID) => {
    const questions = []
    return database.ref(`users/${userID}/questions`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            questions.push(childSnapshot.val().questionRefID)
        })
        userDispatch(setUserQuestions(questions))
    })
}

export const addFollowing = (followingID) => ({
    type: 'ADD_FOLLOWING',
    followingID
})

export const startAddFollowing = (userDispatch, userID, followingID) => {
    return database.ref(`users/${userID}/following`).push({ followingID }).then((ref) => {
        database.ref(`users/${followingID}/followers`).push({ followerID: userID }).then((ref) => {
            userDispatch(addFollowing(followingID))
        })
    })
}

export const removeFollowing = (followingID) => ({
    type: 'REMOVE_FOLLOWING',
    followingID
})

export const startRemoveFollowing = (userDispatch, userID, followingID) => {
    return database.ref(`users/${userID}/following`).once('value').then((snapshot) => {
        let followingRefID = ''
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().followingID === followingID) {
                followingRefID = childSnapshot.key
                return
            }
        })
        database.ref(`users/${userID}/following/${followingRefID}`).remove().then(() => {
            database.ref(`users/${followingID}/followers`).once('value').then((snapshot) => {
                let followerRefID = ''
                snapshot.forEach((childSnapshot) => {
                    if(childSnapshot.val().followerID === userID) {
                        followerRefID = childSnapshot.key
                        return
                    }
                })
                database.ref(`users/${followingID}/followers/${followerRefID}`).remove()
            })
            userDispatch(removeFollowing(followingID))
        })
    })
}

export const setFollowing = (followingIDs) => ({
    type: 'SET_FOLLOWING',
    followingIDs
})

export const startSetFollowing = (userDispatch, userID) => {
    const followingIDs = []
    return database.ref(`users/${userID}/following`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            followingIDs.push(childSnapshot.val().followingID)
        })
        userDispatch(setFollowing(followingIDs))
    })
}

export const addFollower = (followerID) => ({
    type: 'ADD_FOLLOWER',
    followerID
})

export const removeFollower = (followerID) => ({
    type: 'REMOVE_FOLLOWER',
    followerID
})

export const startRemoveFollower = (userDispatch, userID, followerID) => {
    return database.ref(`users/${userID}/followers`).once('value').then((snapshot) => {
        let followerRefID = ''
        snapshot.forEach((childSnapshot) => {
            if(childSnapshot.val().followerID === followerID) {
                followerRefID = childSnapshot.key
                return
            }
        })
        database.ref(`users/${userID}/followers/${followerRefID}`).remove().then(() => {
            database.ref(`users/${followerID}/following`).once('value').then((snapshot) => {
                let followingRefID = ''
                snapshot.forEach((childSnapshot) => {
                    if(childSnapshot.val().followingID === userID) {
                        followingRefID = childSnapshot.key
                        return
                    }
                })
                database.ref(`users/${followerID}/following/${followingRefID}`).remove()
            })
            userDispatch(removeFollower(followerID))
        })
    })
}

export const setFollower = (followerIDs) => ({
    type: 'SET_FOLLOWERS',
    followerIDs
})

export const addAnswered = (answeredQuestion) => ({
    type: 'ADD_ANSWERED',
    answeredQuestion
})

export const startAddAnswered = (userDispatch, userID, answeredQuestion) => {
    return database.ref(`users/${userID}/answered`).push(answeredQuestion).then((ref) => {
        userDispatch(addAnswered(answeredQuestion))
    })
}

export const setAnswered = (answeredQuestions) => ({
    type: 'SET_FOLLOWING',
    answeredQuestions
})

export const startSetAnswered = (userDispatch) => {
    const userID = firebase.auth().currentUser.uid
    const answeredQuestions = []
    return database.ref(`users/${userID}/answered`).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            answeredQuestions.push(childSnapshot.val().answeredQuestion)
        })
        userDispatch(setAnswered(answeredQuestions))
    })
}

