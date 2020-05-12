import React from 'react';
import { connect } from 'react-redux';
import { startLogin } from '../actions/auth';

export const LoginPage = ({ startLogin }) => (
    <div className="box-layout">
        <div className="box-layout__box">
            <h1 className="box-layout__title">DeSide App</h1>
            <p className="box-layout__subtitle">Let the internet deside</p>
            <button onClick={startLogin} className="button button--login">
                <div className="box-layout__login">Login with</div>
                <img className="box-layout__image"src="../images/googleLogo.png"/>
            </button>
        </div>
    </div>
);

const mapDispatchToProps = (dispatch) => ({
    startLogin: () => dispatch(startLogin())
})

export default connect(undefined, mapDispatchToProps)(LoginPage);