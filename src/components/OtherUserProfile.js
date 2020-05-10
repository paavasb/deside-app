import React, { useContext, useEffect } from 'react'
import OtherUserContext from '../context/otheruser-context'
import { history } from '../routers/AppRouter'
import { Link } from 'react-router-dom'
import UserContext from '../context/user-context'
import { startRemoveFollowing, startRemoveFollower, startAddFollowing } from '../actions/user'
import { checkFollowFollowingStatus } from '../actions/helperActions'
import { startSetFollowStatus, startGetOtheruser } from '../actions/otheruser'

const OtherUserProfile = (props) => {
    const { user, userDispatch } = useContext(UserContext)
    const { otheruser, otheruserDispatch } = useContext(OtherUserContext)

    useEffect(() => {
        let mounted = true
        async function useEffectAsync () {
            console.log(user)
            //await startGetOtheruser(props.match.params.id, otheruserDispatch)
            const followStatus = checkFollowFollowingStatus(user.following, user.follower, otheruser.userID)
            startSetFollowStatus(followStatus, otheruserDispatch)
        }

        if(mounted) {
            console.log('Other User Profile Use Effect')
            console.log(otheruser)
        
            useEffectAsync()
        }
        return () => mounted = false
    }, []);

    const unFollowHandler = (followingID) => {
        async function unFollowHandlerAsync() {
            await startRemoveFollowing(userDispatch, user.userID, followingID)
            const followStatus = checkFollowFollowingStatus(user.following, user.followers, followingID)
            console.log('Follow Status', user.following, user.followers, followStatus, followingID)
            await startSetFollowStatus(followStatus, otheruserDispatch)
            //history.replace(`/user`)
            //history.go()
            //window.location.reload(false);
        }

        unFollowHandlerAsync()
    }

    const unFollowerHandler = (followerID) => {
        async function unFollowerHandlerAsync() {
            await startRemoveFollower(userDispatch, user.userID, followerID)
            const followStatus = checkFollowFollowingStatus(user.following, user.followers, followerID)
            await startSetFollowStatus(followStatus, otheruserDispatch)
            //history.replace(`/user`)
            history.go()
        }

        unFollowerHandlerAsync()
    }

    const followBackHandler = (followerID) => {
        async function followBackHandlerAsync() {
            await startAddFollowing(userDispatch, user.userID, followerID)
            const followStatus = checkFollowFollowingStatus(user.following, user.followers, followerID)
            await startSetFollowStatus(followStatus, otheruserDispatch)
            //history.replace(`/user`)
            history.go()
        }

        followBackHandlerAsync()
    }

    return (
        <div>
            <Link className="button" to="/user">
                <p>Go Back</p>
            </Link>
            <div>
                <p>{props.match.params.id}</p>
                <p>{otheruser.username}</p>
                    {
                        !!otheruser.followStatus &&
                        (otheruser.followStatus.followingStatus ?
                        <p>Following</p> :
                        <p>Not Following</p>)
                    }
                    {
                        !!otheruser.followStatus &&
                        (otheruser.followStatus.followerStatus ?
                        <p>Following You</p> :
                        <p>Not Following You</p>)
                    }
                    {
                        !!otheruser.followStatus &&
                        (otheruser.followStatus.followingStatus ?
                        <button onClick={() => unFollowHandler(otheruser.userID)}>Unfollow</button> :
                        otheruser.followStatus.followerStatus ?
                        <button onClick={() => followBackHandler(otheruser.userID)}>Follow Back</button> :
                        <button onClick={() => followBackHandler(otheruser.userID)}>Follow</button>)
                    }
                    {
                        !!otheruser.followStatus &&
                        (otheruser.followStatus.followerStatus &&
                        <button onClick={() => unFollowerHandler(otheruser.userID)}>Remove Follower</button>)
                    }
            </div>
        </div>
    )
}

export default OtherUserProfile

// {
//     otheruser.followStatus.followingStatus ?
//     <p>Following</p> :
//     <p>Not Following</p>
// }
// {
//     otheruser.followStatus.followerStatus ?
//     <p>Following You</p> :
//     <p>Not Following You</p>
// }
// {
//     otheruser.followStatus.followingStatus ?
//     <button onClick={() => unFollowHandler(otheruser.userID)}>Unfollow</button> :
//     otheruser.followStatus.followerStatus ?
//     <button onClick={() => followBackHandler(otheruser.userID)}>Follow Back</button> :
//     <button onClick={() => followBackHandler(otheruser.userID)}>Follow</button>
// }
// {
//     otheruser.followStatus.followerStatus &&
//     <button onClick={() => unFollowerHandler(otheruser.userID)}>Remove Follower</button>
// }