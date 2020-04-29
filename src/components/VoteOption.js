import React from 'react'

const VoteOption = (props) => {

    const textClassSelector = () => {
        if(props.answered) {
            if(props.chosen) {
                return "option__text option__text--chosen"
            } else {
                return "option__text option__text--notchosen"
            }
        } else {
            return "option__text"
        }
    }

    return (
        <div className="option">
            <div className={textClassSelector()}>
                <h4>{props.count}. {props.text} </h4>
                <p>Votes: {props.votes}</p>
            </div>
            <button 
                className="option__button"
                onClick={(e) => {
                    e.preventDefault()
                    props.voteForOption(props.text)
                }}
                disabled={props.answered || props.selfQuestion}
            >
                Vote
            </button>
        </div>
    )
}

export default VoteOption