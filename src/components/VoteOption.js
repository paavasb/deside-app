import React from 'react'
import ProgressBar from 'react-bootstrap/ProgressBar'
//import 'bootstrap/dist/css/bootstrap.min.css';

//TODO: Check if you need to make voting even faster
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
                <h4 className={textClassSelector()}>{props.count}. {props.text} </h4>
                {(props.showVotes || props.selfQuestion) && <p className={textClassSelector()}>Votes: {props.votes}</p>}
                {(props.showVotes || props.selfQuestion) && <ProgressBar now={100 * (props.votes / props.totalVotes)} />}
            </div>
            <button 
                className="option__button"
                onClick={(e) => {
                    e.preventDefault()
                    props.voteForOption(props.text)
                }}
                disabled={props.answered || props.selfQuestion}
            >
                {props.voteText || 'Vote'}
            </button>
        </div>
    )
}

export default VoteOption