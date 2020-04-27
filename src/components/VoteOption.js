import React from 'react'

const VoteOption = (props) => (
    <div>
        <p>{props.count}. {props.text} </p>
        {props.votes && <p>Votes: {props.votes}</p>}
        <button 
            onClick={(e) => {
                e.preventDefault()
                props.voteForOption(props.text)
            }}
            disabled={props.answered}
        >
            Vote
        </button>
    </div>
)

export default VoteOption