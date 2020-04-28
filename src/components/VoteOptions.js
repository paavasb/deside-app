import React, { useState } from 'react'
import VoteOption from './VoteOption'

const VoteOptions = (props) => {

    return (
        <div>
            <div>
                <h3>Your Options</h3>
                {
                    props.options.map((option, index) => (
                        <VoteOption 
                            key={option.text} 
                            text={option.text} 
                            votes={option.votes}
                            count={index + 1}
                            voteForOption = {props.voteForOption}
                            answered = {props.answered}
                            chosen={option.text === props.chosenOption}
                        />
                    ))
                }
            </div>   
        </div>
    )
}

export default VoteOptions