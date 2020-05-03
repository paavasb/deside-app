import React from 'react'
import ProgressBar from 'react-bootstrap/ProgressBar'
import { Progress } from 'semantic-ui-react'

const AnswerOption = (props) => {
    return (
        <div>
            <Progress 
                percent={100 * (props.votes / props.totalVotes)} 
                indicating
                color="red"
            />
        </div>
    )
}

export default AnswerOption

// <ProgressBar
// now={100 * (props.votes / props.totalVotes)} 
// label={`${props.text} (${props.votes})`}
// />