import React, { useState } from 'react'
import VoteOption from './VoteOption'
import ProgressBar from 'react-bootstrap/ProgressBar'
import AnswerOption from './AnswerOption'

const VoteOptions = (props) => {

    let totalVotes = 0
    props.options.forEach((option) => {
        totalVotes += option.votes
    })

    return (
        <div>
            <div>
                {   
                    props.options.map((option, index) => (
                        <VoteOption 
                            key={option.text} 
                            text={option.text} 
                            votes={option.votes}
                            totalVotes={totalVotes}
                            count={index + 1}
                            voteForOption = {props.voteForOption}
                            answered = {props.answered}
                            showVotes = {props.showVotes}
                            voteText={props.voteText}
                            chosen={option.text === props.chosenOption}
                            selfQuestion={props.selfQuestion}
                        />
                    ))
                }
            </div>   
        </div>
    )
}

export default VoteOptions


// {   props.showVotes ? 
//     props.options.map((option, index) => (
//         <AnswerOption 
//             key={option.text} 
//             text={option.text} 
//             votes={option.votes}
//             totalVotes={totalVotes}
//             count={index + 1}
//             voteForOption = {props.voteForOption}
//             answered = {props.answered}
//             showVotes = {props.showVotes}
//             voteText={props.voteText}
//             chosen={option.text === props.chosenOption}
//             selfQuestion={props.selfQuestion}
//         />
//     ))
//     :
//     props.options.map((option, index) => (
//         <VoteOption 
//             key={option.text} 
//             text={option.text} 
//             votes={option.votes}
//             totalVotes={totalVotes}
//             count={index + 1}
//             voteForOption = {props.voteForOption}
//             answered = {props.answered}
//             showVotes = {props.showVotes}
//             voteText={props.voteText}
//             chosen={option.text === props.chosenOption}
//             selfQuestion={props.selfQuestion}
//         />
//     ))
// }