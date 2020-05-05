import React, { useState, useReducer, useContext, useEffect } from 'react'
import database from '../firebase/firebase';
import * as firebase from 'firebase';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUsername } from '../actions/user';
import UserContext from '../context/user-context';
import { getUsername } from '../actions/helperActions';

const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    const [name, setName] = useState(user.username || "")
    const [followingUsernames, setFollowingUsernames] = useState([])
    const [followersUsernames, setFollowersUsernames] = useState([])

    useEffect(() => {
        let mounted = true

        async function getFollowingUsernames() {
            await user.following.forEach(async (followingID) => {
                const username = await getUsername(followingID)
                console.log('Username: ', username)
                setFollowingUsernames([...followingUsernames, username])
            })
            await user.followers.forEach(async (followerID) => {
                const username = await getUsername(followerID)
                setFollowersUsernames([...followersUsernames, username])
            })
            //console.log(fUsernames)
            //setFollowingUsernames(fUsernames)
        }

        if(mounted) {
            getFollowingUsernames()
        }
        return () => mounted = false
    }, [])


    const onSubmitHandler = (e) => {
        e.preventDefault()
        startSetUsername(userDispatch, user, name)
    }

    return (
        <div>
            <p>Hi</p>
            <p>{firebase.auth().currentUser.displayName}</p>
            <form onSubmit={onSubmitHandler}>
                <h3>Username:</h3>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}/>
                <button>set username</button>
                <h3>Following ({user.following.length}): </h3>
                {
                    followingUsernames.map((followingUsername) => {
                        return (<p key={followingUsername}>{followingUsername}</p>)
                    })
                }
                <h3>Followers ({user.followers.length}): </h3>
                {
                    followersUsernames.map((followerUsername) => {
                        return (<p key={followerUsername}>{followerUsername}</p>)
                    })
                }
            </form>
        </div>
    )
}

export default UserInfoPage