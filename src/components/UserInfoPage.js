import React, { useState, useReducer, useContext, useEffect } from 'react'
import database from '../firebase/firebase'
import * as firebase from 'firebase'
import ReactSearchBox from 'react-search-box'
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUsername, startRemoveFollowing, startRemoveFollower, startSetUser, startAddFollowing } from '../actions/user';
import UserContext from '../context/user-context';
import { getUsername, getUsernames, checkFollow, checkFollowingBack, checkFollowFollowingStatus } from '../actions/helperActions';
import userlistReducer, { userlistDefaultState } from '../reducers/userlist';
import { startSetUserlist } from '../actions/userlist';
import UserListContext from '../context/userlist-context';

//TODO: Style User Info Page
//TODO: Search Users
const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)  //Current User
    const [userlist, userlistDispatch] = useReducer(userlistReducer, userlistDefaultState)  //List of users and usernames
    const [name, setName] = useState(user.username || "")   //Current username
    const [followingUsernames, setFollowingUsernames] = useState([])    //List of followings (current user)
    const [followersUsernames, setFollowersUsernames] = useState([])    //List of followers (current user)
    const [changeUsername, setChangeUsername] = useState(false) //Username change option status
    const [showFollowing, setShowFollowing] = useState(false)   //Following display option status
    const [showFollowers, setShowFollowers] = useState(false)   //Followers display option status
    const [showSearch, setShowSearch] = useState(false) //Search functionality display status
    const [showUserListData, setShowUserListData] = useState(false) //
    const [selectedUser, setSelectedUser] = useState({})    //User selected from search
    const [showSelectedUser, setShowSelectedUser] = useState(false) //Show details for selected user status

    useEffect(() => {
        let mounted = true
        async function getFollowingUsernames() {
            setFollowingUsernames(await getUsernames(user.following))
        
            await user.followers.forEach(async (followerID) => {
                setFollowersUsernames(await getUsernames(user.followers))
            })

            await startSetUserlist(userlistDispatch)
        }

        if(mounted) {
            getFollowingUsernames()
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
            //console.log(followingID)
            startRemoveFollowing(userDispatch, user.userID, followingID)
        }

        unFollowHandlerAsync()
    }

    const unFollowerHandler = (followerID) => {
        async function unFollowerHandlerAsync() {
            //console.log(followerID)
            await startRemoveFollower(userDispatch, user.userID, followerID)
        }

        unFollowerHandlerAsync()
    }

    const followBackHandler = (followerID) => {
        async function followBackHandlerAsync() {
            //console.log(followerID)
            await startAddFollowing(userDispatch, user.userID, followerID)
        }

        followBackHandlerAsync()
    }

    const searchOnSelect = (selected) => {
        async function searchOnSelectAsync() {
            console.log(selected)
            const userID = selected.key
            const username = selected.value
            const followStatus = checkFollowFollowingStatus(user.following, user.followers, userID)
            setSelectedUser({
                userID,
                username,
                followStatus
            }) 
            console.log(selectedUser)
            setShowSelectedUser(true)
        }

        searchOnSelectAsync()
    }

    return (
        
        <div className="content-container">
            <div>
                {<ReactSearchBox
                    placeholder="Search for users"
                    value=""
                    data={userlist}
                    callback={record => console.log(record)}
                    dropDownHoverColor='#ADD8E6'
                    onSelect={searchOnSelect}
                />}
                {
                    showSelectedUser &&
                    (
                        <div>
                            <p>{selectedUser.username}</p>
                            {
                                selectedUser.followStatus.followingStatus ?
                                <p>Following</p> :
                                <p>Not Following</p>
                            }
                            {
                                selectedUser.followStatus.followerStatus ?
                                <p>Following You</p> :
                                <p>Not Following You</p>
                            }
                            {
                                selectedUser.followStatus.followingStatus ?
                                <button onClick={() => unFollowHandler(selectedUser.userID)}>Unfollow</button> :
                                selectedUser.followStatus.followerStatus ?
                                <button onClick={() => followBackHandler(selectedUser.userID)}>Follow Back</button> :
                                <button onClick={() => followBackHandler(selectedUser.userID)}>Follow</button>
                            }
                            {
                                selectedUser.followStatus.followerStatus &&
                                <button onClick={() => unFollowerHandler(selectedUser.userID)}>Remove Follower</button>
                            }
                            <button onClick={() => setShowSelectedUser(false)}>Cancel</button>
                        </div>
                    )
                }
            </div>
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