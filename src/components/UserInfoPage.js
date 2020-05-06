import React, { useState, useReducer, useContext, useEffect } from 'react'
import database from '../firebase/firebase';
import * as firebase from 'firebase';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUsername, startRemoveFollowing, startRemoveFollower } from '../actions/user';
import UserContext from '../context/user-context';
import { getUsername, getUsernames } from '../actions/helperActions';

const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    const [name, setName] = useState(user.username || "")
    const [followingUsernames, setFollowingUsernames] = useState([])
    const [followersUsernames, setFollowersUsernames] = useState([])
    const [changeUsername, setChangeUsername] = useState(false)

    useEffect(() => {
        let mounted = true

        async function getFollowingUsernames() {
            //console.log('IDs: ', user.following)
            //const usernames = await getUsernames(user.following)
            setFollowingUsernames(await getUsernames(user.following))
            // await user.following.forEach(async (followingID) => {
            //     let followingList = []
            //     const username = await getUsername(followingID)
            //     followingList.push(username)
            //     //console.log('Username: ', username)
            //     console.log(followingUsernames)
            //     setFollowingUsernames(followingList)
            // })
        
            await user.followers.forEach(async (followerID) => {
                // const username = await getUsername(followerID)
                // setFollowersUsernames([...followersUsernames, username])
                setFollowersUsernames(await getUsernames(user.followers))
            })
            //console.log(fUsernames)
            //setFollowingUsernames(fUsernames)
        }

        if(mounted) {

            getFollowingUsernames()
            //console.log(followingUsernames)
            //console.log(user.following)
        }
        return () => mounted = false
    }, [])


    const onSubmitHandler = (e) => {
        async function onSubmitHandlerAsync(e) {
            e.preventDefault()
            startSetUsername(userDispatch, user, name)
            setChangeUsername(false)
        }

        onSubmitHandlerAsync(e)
    }

    const unFollowHandler = (followingID) => {
        async function unFollowHandlerAsync() {
            console.log(followingID)
            startRemoveFollowing(userDispatch, user.userID, followingID)
        }

        unFollowHandlerAsync()
    }

    const unFollowerHandler = (followerID) => {
        async function unFollowerHandlerAsync() {
            console.log(followerID)
            startRemoveFollower(userDispatch, user.userID, followerID)
        }

        unFollowerHandlerAsync()
    }

    return (
        <div>
            <p>Hi</p>
            <p>{firebase.auth().currentUser.displayName}</p>
            <h3>Username: {user.username}</h3>
            <form onSubmit={onSubmitHandler}>
                {
                    changeUsername ?
                    <div>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}/>
                        <button>Set Username</button>
                        <button onClick={(e) => {
                            e.preventDefault()
                            setChangeUsername(false)}}
                        >Cancel</button>
                    </div> :
                    <button onClick={(e) => {
                        e.preventDefault()
                        setChangeUsername(true)}}
                    > Change Username </button>
                }
            </form>
            <h3>Following ({user.following.length}): </h3>
            {
                followingUsernames.map((followingUsername, index) => {
                    return (
                        <div key={followingUsername}>
                        <p>{followingUsername}</p>
                        <button onClick={() => unFollowHandler(user.following[index])}>Unfollow</button> 
                        </div>
                        
                    )
                })
            }
            <h3>Followers ({user.followers.length}): </h3>
            {
                followersUsernames.map((followerUsername, index) => {
                    return (
                        <div key={followerUsername}>
                            <p>{followerUsername}</p>
                            <button onClick={() => unFollowerHandler(user.followers[index])}>Remove Follower</button> 
                        </div>
                    )
                })
            }
        </div>
    )
}

export default UserInfoPage


// <h3>Following ({user.following.length}): </h3>
// {
//     followingUsernames.map((followingUsername, index) => {
//         return (
//             <div key={followingUsername}>
//             <p>{followingUsername}</p>
//             <button >Unfollow</button> 
//             </div>
            
//         )
//     })
// }