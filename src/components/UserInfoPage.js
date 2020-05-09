import React, { useState, useReducer, useContext, useEffect } from 'react'
import database from '../firebase/firebase';
import * as firebase from 'firebase';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUsername, startRemoveFollowing, startRemoveFollower, startSetUser, startAddFollowing } from '../actions/user';
import UserContext from '../context/user-context';
import { getUsername, getUsernames, checkFollow, checkFollowingBack } from '../actions/helperActions';

//TODO: Style User Info Page
//TODO: Search Users
const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    const [name, setName] = useState(user.username || "")
    const [followingUsernames, setFollowingUsernames] = useState([])
    const [followersUsernames, setFollowersUsernames] = useState([])
    const [changeUsername, setChangeUsername] = useState(false)
    const [showFollowing, setShowFollowing] = useState(false)
    const [showFollowers, setShowFollowers] = useState(false)

    useEffect(() => {
        let mounted = true
        async function getFollowingUsernames() {
            //console.log('IDs: ', user.following)
            //const usernames = await getUsernames(user.following)
            //await startSetUser(userDispatch)
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
            //startSetUser(userDispatch)
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
            await startRemoveFollower(userDispatch, user.userID, followerID)
        }

        unFollowerHandlerAsync()
    }

    const followBackHandler = (followerID) => {
        async function followBackHandlerAsync() {
            console.log(followerID)
            await startAddFollowing(userDispatch, user.userID, followerID)
        }

        followBackHandlerAsync()
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
            <h3>Following ({user.following.length})</h3>
            <button onClick={(e) => {
                e.preventDefault()
                setShowFollowing(!showFollowing)}}>{showFollowing ? 'Hide Following' : 'Show Following'}</button>
            {
                showFollowing &&
                    followingUsernames.map((followingUsername, index) => {
                        return (
                            <div key={followingUsername}>
                            <p>{followingUsername}</p>
                            <button onClick={() => unFollowHandler(user.following[index])}>Unfollow</button> 
                            </div>
                            
                        )
                    })
            }
            <h3>Followers ({user.followers.length})</h3>
            <button onClick={(e) => {
                e.preventDefault()
                setShowFollowers(!showFollowers)}}>{showFollowers ? 'Hide Followers' : 'Show Followers'}</button>
            {
                showFollowers &&
                followersUsernames.map((followerUsername, index) => {
                    const followingBack = checkFollowingBack(user.following, user.followers[index])
                    return (
                        <div key={followerUsername}>
                            <p>{followerUsername}</p>
                            <button onClick={() => unFollowerHandler(user.followers[index])}>Remove Follower</button>
                            {   followingBack ? 
                                <p>Following Back</p> :
                                <button onClick={() => followBackHandler(user.followers[index])}>Follow Back</button>
                            }
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