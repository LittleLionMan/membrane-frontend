import { background } from "@chakra-ui/react";
import { color, px } from "framer-motion";
import { useEffect, useState } from "react";
import React from "react";

import { testnetAddrs } from "../config";
import { Coin, coin, coins, parseCoins } from "@cosmjs/amino";
import { StargateClient } from "@cosmjs/stargate";
import { PositionsClient, PositionsQueryClient } from "../codegen/positions/Positions.client";
import { Asset, BasketPositionsResponse, NativeToken, PositionResponse, RedeemabilityResponse } from "../codegen/positions/Positions.types";
import { denoms, Prices } from ".";
import Popup from "../components/Popup";
import Image from "next/image";
import { relative } from "path";
import { ReactJSXElement } from "@emotion/react/types/jsx-namespace";

declare module 'react' {
    export interface InputHTMLAttributes<T> {
      orient?: string;
    }
  }

interface Props {
    cdp_client: PositionsClient | null;
    queryClient: PositionsQueryClient | null;
    address: string | undefined;
    walletCDT: number;
    prices: Prices;
    //State
    popupTrigger: boolean;
    setPopupTrigger: (popupTrigger: boolean) => void;
    popupMsg: ReactJSXElement;
    setPopupMsg: (popupMsg: ReactJSXElement) => void;
    popupStatus: string;
    setPopupStatus: (popupStatus: string) => void;
    //Redemptions
    posClick: string;
    setposClick: (posClick: string) => void;
    negClick: string;
    setnegClick: (negClick: string) => void;
    redeemScreen: string;
    setredeemScreen: (redeemScreen: string) => void;
    redeemInfoScreen: string;
    setredeemInfoScreen: (redeemInfoScreen: string) => void;
    redeemButton: string;
    setredeemButton: (redeemButton: string) => void;
    redeemability: boolean | undefined;
    setRedeemability: (redeemability: boolean | undefined) => void;
    premium: number | undefined;
    setPremium: (premium: number) => void;
    loanUsage: string | undefined;
    setloanUsage: (loanUsage: string) => void;
    restrictedAssets: {
        sentence: string,
        readable_assets: string[],
        assets: string[],
    };
    setRestricted: (restrictedAssets: {
        sentence: string,
        readable_assets: string[],
        assets: string[],
    }) => void;
    //Asset specific
        //qty
    osmoQTY: number;
    setosmoQTY: (osmoQTY: number) => void;
    atomQTY: number;
    setatomQTY: (atomQTY: number) => void;
    axlusdcQTY: number;
    setaxlusdcQTY: (axlusdcQTY: number) => void;
    atomosmo_poolQTY: number;
    setatomosmo_poolQTY: (atomosmo_poolQTY: number) => void;
    osmousdc_poolQTY: number;
    setosmousdc_poolQTY: (osmousdc_poolQTY: number) => void;
        //style
    osmoStyle: string;
    setosmoStyle: (osmoStyle: string) => void;
    atomStyle: string;
    setatomStyle: (atomStyle: string) => void;
    axlusdcStyle: string;
    setaxlusdcStyle: (axlusdcStyle: string) => void;
    atomosmo_poolStyle: string;
    setatomosmo_poolStyle: (atomosmo_poolStyle: string) => void;
    osmousdc_poolStyle: string;
    setosmousdc_poolStyle: (osmousdc_poolStyle: string) => void;
    //Positions Visual
    debtAmount: number;
    setdebtAmount: (debtAmount: number) => void;
    maxLTV: number;
    setmaxLTV: (maxLTV: number) => void;
    brwLTV: number;
    setbrwLTV: (brwLTV: number) => void;
    cost: number;
    setCost: (cost: number) => void;
    positionID: string;
    setpositionID: (positionID: string) => void;
    user_address: string;
    setAddress: (user_address: string) => void;
    sliderValue: number;
    setsliderValue: (sliderValue: number) => void;
    creditPrice: number;
    setcreditPrice: (creditPrice: number) => void;          
}

const Positions = ({cdp_client, queryClient, address, walletCDT, prices, 
    popupTrigger, setPopupTrigger, popupMsg, setPopupMsg, popupStatus, setPopupStatus,
    posClick, setposClick,
    negClick, setnegClick,
    redeemScreen, setredeemScreen,
    redeemInfoScreen, setredeemInfoScreen,
    redeemButton, setredeemButton,
    redeemability, setRedeemability,
    premium, setPremium,
    loanUsage, setloanUsage,
    restrictedAssets, setRestricted,
    osmoQTY, setosmoQTY,
    atomQTY, setatomQTY,
    axlusdcQTY, setaxlusdcQTY,
    atomosmo_poolQTY, setatomosmo_poolQTY,
    osmousdc_poolQTY, setosmousdc_poolQTY,
    osmoStyle, setosmoStyle,
    atomStyle, setatomStyle,
    axlusdcStyle, setaxlusdcStyle,
    atomosmo_poolStyle, setatomosmo_poolStyle,
    osmousdc_poolStyle, setosmousdc_poolStyle,
    debtAmount, setdebtAmount,
    maxLTV, setmaxLTV,
    brwLTV, setbrwLTV,
    cost, setCost,
    positionID, setpositionID,
    user_address, setAddress,
    sliderValue, setsliderValue,
    creditPrice, setcreditPrice
}: Props) => {
    
    const [redemptionRes, setredemptionRes] = useState<RedeemabilityResponse>();
    //Deposit-Withdraw screen
    const [depositwithdrawScreen, setdepositwithdrawScreen] = useState("deposit-withdraw-screen");
    const [currentfunctionLabel, setcurrentfunctionLabel] = useState("");
    const [currentAsset, setcurrentAsset] = useState("");
    const [assetIntent, setassetIntent] = useState<[string , number][]>([]);
    const [maxLPamount, setmaxLPamount] = useState<bigint>(BigInt(0));
    const [amount, setAmount] = useState<number | undefined>();

    const [contractQTYs, setcontractQTYs] = useState({
        osmo: osmoQTY,
        atom: atomQTY,
        axlusdc: axlusdcQTY,
        atomosmo_pool: atomosmo_poolQTY,
        osmousdc_pool: osmousdc_poolQTY
    });

    const handleOSMOqtyClick = async (currentFunction: string) => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setdepositwithdrawScreen("deposit-withdraw-screen front-screen");
        setcurrentAsset("OSMO");
        if (currentFunction !== "withdraw") {
            setcurrentfunctionLabel("deposit");
            //Get account's balance
            if (address !== undefined) {
                queryClient?.client.getBalance(address as string, denoms.osmo).then((res) => {
                    setmaxLPamount(BigInt(res.amount) / 1_000_000n);
                })
            }
        } else if (currentFunction == "withdraw") {
            //Set max to collateral amount
            setmaxLPamount(BigInt(contractQTYs.osmo))
        }
        //Send to back
        setredeemScreen("redemption-screen");
        // setcloseScreen("redemption-screen");
        setredeemInfoScreen("redemption-screen");
    };
    const handleATOMqtyClick = async (currentFunction: string) => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setdepositwithdrawScreen("deposit-withdraw-screen front-screen");
        setcurrentAsset("ATOM");
        if (currentFunction !== "withdraw") {
            setcurrentfunctionLabel("deposit");
            //Get account's balance
            if (address !== undefined) {
                queryClient?.client.getBalance(address as string, denoms.atom).then((res) => {
                    setmaxLPamount(BigInt(res.amount) / 1_000_000n);
                })
            }
        } else if (currentFunction == "withdraw") {
            //Set max to collateral amount
            setmaxLPamount(BigInt(contractQTYs.atom))
        }
        //Send to back
        setredeemScreen("redemption-screen");
        // setcloseScreen("redemption-screen");
        setredeemInfoScreen("redemption-screen");
    };
    const handleaxlUSDCqtyClick = async (currentFunction: string) => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setdepositwithdrawScreen("deposit-withdraw-screen front-screen");
        setcurrentAsset("axlUSDC");
        if (currentFunction !== "withdraw") {
            setcurrentfunctionLabel("deposit");
            //Get account's balance
            if (address !== undefined) {
                queryClient?.client.getBalance(address as string, denoms.axlUSDC).then((res) => {
                    setmaxLPamount(BigInt(res.amount) / 1_000_000n);
                })
            }
        } else if (currentFunction == "withdraw") {
            //Set max to collateral amount
            setmaxLPamount(BigInt(contractQTYs.axlusdc))
        }
        //Send to back
        setredeemScreen("redemption-screen");
        // setcloseScreen("redemption-screen");
        setredeemInfoScreen("redemption-screen");
    };    
    const handleatomosmo_poolqtyClick = async (currentFunction: string) => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setdepositwithdrawScreen("deposit-withdraw-screen front-screen");
        setcurrentAsset("ATOM-OSMO LP");
        if (currentFunction !== "withdraw") {
            setcurrentfunctionLabel("deposit");
            //Get account's balance
            if (address !== undefined) {
                queryClient?.client.getBalance(address as string, denoms.atomosmo_pool).then((res) => {
                    setmaxLPamount(BigInt(res.amount));
                })
            }
        } else if (currentFunction == "withdraw") {
            //Set max to collateral amount
            setmaxLPamount(BigInt(contractQTYs.atomosmo_pool))
        }
        //Send to back
        setredeemScreen("redemption-screen");
        // setcloseScreen("redemption-screen");
        setredeemInfoScreen("redemption-screen");
    };
    const handleosmousdc_poolqtyClick = async (currentFunction: string) => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setdepositwithdrawScreen("deposit-withdraw-screen front-screen");
        setcurrentAsset("OSMO-axlUSDC LP");
        if (currentFunction !== "withdraw") {
            setcurrentfunctionLabel("deposit");
            //Get account's balance
            if (address !== undefined) {
                queryClient?.client.getBalance(address as string, denoms.osmousdc_pool).then((res) => {
                    setmaxLPamount(BigInt(res.amount));
                })
            }
        } else if (currentFunction == "withdraw") {
            //Set max to collateral amount
            setmaxLPamount(BigInt(contractQTYs.osmousdc_pool))
        }
        //Send to back
        setredeemScreen("redemption-screen");
        // setcloseScreen("redemption-screen");
        setredeemInfoScreen("redemption-screen");
    };

   //Redeem
    const handleredeemScreen = () => {
        setredeemScreen("redemption-screen front-screen");
        setredeemInfoScreen("redemption-screen");
        setdepositwithdrawScreen("deposit-withdraw-screen");
        //Set functionality        
        setcurrentfunctionLabel("redemptions");
        //
        //Format popup to inform user that redemptions are unaudited
        setPopupTrigger(true);
        setPopupMsg(<div>"Redemptions are unaudited & fully opt-in, so please use at your own risk."</div>);
        setPopupStatus("Warning");
    };
    const handleredeeminfoClick = async () => {

        try {
            console.log("trying")
            await queryClient?.getBasketRedeemability({
                limit: 1,
                positionOwner: user_address,
            }).then((res) => {

            if (res?.premium_infos.length > 0) {
                setredemptionRes(res)
                setredeemScreen("redemption-screen");
                setredeemInfoScreen("redemption-screen front-screen");
                setredeemButton("user-redemption-button")
            } else {
                setredeemButton("user-redemption-button red-border")
            }
            console.log(res)
        })
        } catch (error) {
            setredeemButton("user-redemption-button red-border")
            console.log(error)
        }   

    };
    const handlesetPremium = (event: any) => {
        event.preventDefault();
        setPremium(event.target.value);
      };
    const handlesetloanUsage = (event: any) => {
        event.preventDefault();
        setloanUsage(event.target.value);
    };
    const handleposClick = () => {
        if (posClick == "mint-button-icon3") {
            setposClick("mint-button-icon3-solid");
            setnegClick("mint-button-icon4");
            setRedeemability(true);
        } else {
            setposClick("mint-button-icon3");
            setRedeemability(undefined);
        }
      };

    const handlenegClick = () => {
        if (negClick == "mint-button-icon4") {
            setnegClick("mint-button-icon4-solid");
            setposClick("mint-button-icon3");
            setRedeemability(false);
        } else {
            setnegClick("mint-button-icon4");
            setRedeemability(undefined);
        }
      };
    const handleOSMOClick = () => {
        //Search for OSMO_denom in the asset list
        let asset_check = restrictedAssets.assets.filter(asset => asset === denoms.osmo)
        
        //If unadded, add to assets && sentence
        if (asset_check.length == 0) {
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: [
                        ...prevState.readable_assets,
                        "OSMO"
                    ],
                    assets: [
                        ...prevState.assets,
                        denoms.osmo
                    ]
                }
            })
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        } else {
            //Remove from assets list
            let asset_check = restrictedAssets.assets.filter(asset => asset != denoms.osmo)
            let readable_asset_check = restrictedAssets.readable_assets.filter(asset => asset != "OSMO")
            //Update assets
                        //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: readable_asset_check,
                    assets: asset_check
                }
            })
            //Update sentence
                        //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        }
    };
    const handleATOMClick = () => {
        //Search for ATOM_denom in the asset list
        let asset_check = restrictedAssets.assets.filter(asset => asset === denoms.atom)
        
        //If unadded, add to assets && sentence
        if (asset_check.length == 0) {
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: [
                        ...prevState.readable_assets,
                        "ATOM"
                    ],
                    assets: [
                        ...prevState.assets,
                        denoms.atom
                    ]
                }
            })
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        } else {
            //Remove from assets list
            let asset_check = restrictedAssets.assets.filter(asset => asset != denoms.atom)
            let readable_asset_check = restrictedAssets.readable_assets.filter(asset => asset != "ATOM")
            //Update assets
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: readable_asset_check,
                    assets: asset_check
                }
            })
            //Update sentence
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        }
    };
    const handleaxlUSDCClick = () => {
        //Search for axlUSDC_denom in the asset list
        let asset_check = restrictedAssets.assets.filter(asset => asset === denoms.axlUSDC)
        
        //If unadded, add to assets && sentence
        if (asset_check.length == 0) {
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: [
                        ...prevState.readable_assets,
                        "axlUSDC"
                    ],
                    assets: [
                        ...prevState.assets,
                        denoms.axlUSDC
                    ]
                }
            })
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        } else {
            //Remove from assets list
            let asset_check = restrictedAssets.assets.filter(asset => asset != denoms.axlUSDC)
            let readable_asset_check = restrictedAssets.readable_assets.filter(asset => asset != "axlUSDC")
            //Update assets
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: readable_asset_check,
                    assets: asset_check
                }
            })
            //Update sentence
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        }
    };
    const handleatomosmo_poolClick = () => {
        //Search for atomosmo_pool denom in the asset list
        let asset_check = restrictedAssets.assets.filter(asset => asset === denoms.atomosmo_pool)
        
        //If unadded, add to assets && sentence
        if (asset_check.length == 0) {
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: [
                        ...prevState.readable_assets,
                        "ATOM-OSMO LP"
                    ],
                    assets: [
                        ...prevState.assets,
                        denoms.atomosmo_pool
                    ]
                }
            })
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        } else {
            //Remove from assets list
            let asset_check = restrictedAssets.assets.filter(asset => asset != denoms.atomosmo_pool)
            let readable_asset_check = restrictedAssets.readable_assets.filter(asset => asset != "ATOM-OSMO LP")
            //Update assets
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: readable_asset_check,
                    assets: asset_check
                }
            })
            //Update sentence
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        }
    };
    const handleosmousdc_poolClick = () => {
        //Search for osmousdc_pool denom in the asset list
        let asset_check = restrictedAssets.assets.filter(asset => asset === denoms.osmousdc_pool)
        
        //If unadded, add to assets && sentence
        if (asset_check.length == 0) {
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: [
                        ...prevState.readable_assets,
                        "OSMO-axlUSDC LP"
                    ],
                    assets: [
                        ...prevState.assets,
                        denoms.osmousdc_pool
                    ]
                }
            })
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        } else {
            //Remove from assets list
            let asset_check = restrictedAssets.assets.filter(asset => asset != denoms.osmousdc_pool)
            let readable_asset_check = restrictedAssets.readable_assets.filter(asset => asset != "OSMO-axlUSDC LP")
            //Update assets
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    readable_assets: readable_asset_check,
                    assets: asset_check
                }
            })
            //Update sentence
            //@ts-ignore
            setRestricted(prevState => {
                return { 
                    ...prevState,
                    sentence: "Click Assets on the left to restrict redemption from, currently restricted: " + prevState.readable_assets,
                }
            })
        }
    };
    const handlesetAmountInput = (event: any) => {
        event.preventDefault();
        setAmount(event.target.value);
        if (currentfunctionLabel === "deposit"){
            //Subtract from qty to reset amount to the actual ownership
            // handleQTYsubtraction(currentAsset, amount as number);
            //Add to qty to enable responsive Data/Visuals
            handleQTYaddition(currentAsset, event.target.value - (amount??0) as number);            
        } else if (currentfunctionLabel === "withdraw"){
            if (event.target.value > maxLPamount) {
                setAmount(Number(maxLPamount));
            }
            //Add to qty to reset amount to the actual ownership
            // handleQTYaddition(currentAsset, amount as number);    
            //Subtract from qty to enable responsive Data/Visuals
            handleQTYsubtraction(currentAsset, +(event.target.value) - +(amount as number));
        }
      };
    const handlesetAmount = () => {
        var newAmount = Number(maxLPamount);
        setAmount(newAmount);
        if (currentfunctionLabel === "deposit"){
            //Subtract from qty to reset amount to the actual ownership
            // handleQTYsubtraction(currentAsset, amount as number);
            //Add to qty to enable responsive Data/Visuals
            handleQTYaddition(currentAsset, newAmount - (amount??0) as number);            
        } else if (currentfunctionLabel === "withdraw"){
            if (newAmount > maxLPamount) {
                setAmount(Number(maxLPamount));
            }
            //Add to qty to reset amount to the actual ownership
            // handleQTYaddition(currentAsset, amount as number);    
            //Subtract from qty to enable responsive Data/Visuals
            handleQTYsubtraction(currentAsset, +(newAmount) - +(amount as number));
        }
    };
    //Reset QTYs to their contract based values
    const resetQTYs = () => {
        setosmoQTY(contractQTYs.osmo);
        setatomQTY(contractQTYs.atom);
        setaxlusdcQTY(contractQTYs.axlusdc);
        setatomosmo_poolQTY(contractQTYs.atomosmo_pool);
        setosmousdc_poolQTY(contractQTYs.osmousdc_pool);
    }
    //Deposit-Withdraw screen    
    const handledepositClick = async () => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setcurrentfunctionLabel("deposit");
        //clear intents
        setassetIntent([]);
        switch (currentAsset) {
            case "OSMO": {
                handleOSMOqtyClick("deposit")
                break;
            }
            case "ATOM": {
                handleATOMqtyClick("deposit")
                break;
            }
            case "axlUSDC": {
                handleaxlUSDCqtyClick("deposit")
                break;
            }
            case "ATOM-OSMO LP": {
                handleatomosmo_poolqtyClick("deposit")
                break;
            }
            case "OSMO-axlUSDC LP": {
                handleosmousdc_poolqtyClick("deposit")
                break;
            }
        }
    };
    const handlewithdrawClick = async () => {
        //Reset Amount
        setAmount(0);
        //Reset QTYs
        resetQTYs();
        //Set functionality
        setcurrentfunctionLabel("withdraw");
        //clear intents
        setassetIntent([]);
        switch (currentAsset) {
            case "OSMO": {
                handleOSMOqtyClick("withdraw")
                break;
            }
            case "ATOM": {
                handleATOMqtyClick("withdraw")
                break;
            }
            case "axlUSDC": {
                handleaxlUSDCqtyClick("withdraw")
                break;
            }
            case "ATOM-OSMO LP": {
                handleatomosmo_poolqtyClick("withdraw")
                break;
            }
            case "OSMO-axlUSDC LP": {
                handleosmousdc_poolqtyClick("withdraw");
                break;
            }
        }
    };
    //Logo functionality activation
    const handleQTYaddition = (current_asset: string, amount: number) => {

        switch(current_asset) {
            case 'OSMO': {
                var new_qty = Math.max(+osmoQTY + +amount, 0);
                setosmoQTY(new_qty);

                //Remove opacity if above 0
                if (new_qty > 0){
                    setosmoStyle("");
                }
                break;
              }
            case 'ATOM':{
                var new_qty =  Math.max(+atomQTY + +amount, 0);
                setatomQTY(new_qty);
                
                //Remove opacity if above 0
                if (new_qty > 0){
                    setatomStyle("");
                }
                break;
              }
            case 'axlUSDC':{
                var new_qty =  Math.max(+axlusdcQTY + +amount, 0);
                setaxlusdcQTY(new_qty);

                //Remove opacity if above 0
                if (new_qty > 0){
                    setaxlusdcStyle("");
                }
                break;
              }
            case 'atomosmo_pool':{
                var new_qty =  Math.max(+atomosmo_poolQTY + +amount, 0);
                setatomosmo_poolQTY(new_qty);

                //Remove opacity if above 0
                if (new_qty > 0){
                    setatomosmo_poolStyle("");
                }
                break;
            }
            case 'osmousdc_pool':{
                var new_qty =  Math.max(+osmousdc_poolQTY + +amount, 0);
                setosmousdc_poolQTY(new_qty);

                //Remove opacity if above 0
                if (new_qty > 0){
                    setosmousdc_poolStyle("");
                }
                break;
            }
          }
    };
    const handleQTYsubtraction = (current_asset: string, amount: number) => {

        switch(current_asset) {
            case 'OSMO': {
                var new_qty = Math.max(+osmoQTY - +amount, 0);
                setosmoQTY(new_qty);

                //Set opacity if 0 & set to if below
                if (new_qty <= 0){
                    setosmoStyle("low-opacity");
                    setosmoQTY(0);
                    new_qty = 0;
                }
                break;
              }
            case 'ATOM':{
                var new_qty = Math.max(+atomQTY - +amount, 0);
                setatomQTY(new_qty);

                //Set opacity if 0 & set to if below
                if (new_qty <= 0){
                    setatomStyle("low-opacity");
                    setatomQTY(0);
                    new_qty = 0;
                }
                break;
              }
            case 'axlUSDC':{
                var new_qty = Math.max(+axlusdcQTY - +amount, 0);
                setaxlusdcQTY(new_qty);

                //Set opacity if 0 & set to if below
                if (new_qty <= 0){
                    setaxlusdcStyle("low-opacity");
                    setaxlusdcQTY(0);
                    new_qty = 0;
                }
                break;
              }
            case 'atomosmo_pool':{
                var new_qty = Math.max(+atomosmo_poolQTY - +amount, 0);
                setatomosmo_poolQTY(new_qty);

                //Set opacity if 0 & set to if below
                if (new_qty <= 0){
                    setatomosmo_poolStyle("low-opacity");
                    setatomosmo_poolQTY(0);
                    new_qty = 0;
                }
                break;
            }
            case 'osmousdc_pool':{
                var new_qty = Math.max(+osmousdc_poolQTY - +amount, 0);
                setosmousdc_poolQTY(new_qty);

                //Set opacity if 0 & set to if below
                if (new_qty <= 0){
                    setosmousdc_poolStyle("low-opacity");
                    setosmousdc_poolQTY(0);
                    new_qty = 0;
                }
                break;
            }
          }
    };
    const handleExecution = async () => {
        //Check if wallet is connected
        if (address === undefined) {
          setPopupMsg(<div>Connect your wallet on the dashboard</div>)
          setPopupStatus("Wallet not connected")
          setPopupTrigger(true)
          return;
        }
        //create a variable for asset_intents so we can mutate it within the function
        //duplicate intents dont work
        var asset_intent = assetIntent;
        //switch on functionality
        switch (currentfunctionLabel){
            case "deposit":{
                if (asset_intent.length === 0){
                    asset_intent = [[currentAsset, amount ?? 0]];
                }
                ///parse assets into coin amounts
                var user_coins = getcoinsfromassetIntents(asset_intent);

                try {
                    ////Execute Deposit////
                    await cdp_client?.deposit({
                        positionId: (positionID === "0" ? undefined : positionID),
                        positionOwner: user_address,
                    },
                    "auto", undefined, user_coins).then(async (res) => {
                        console.log(res?.events.toString())
                        //format pop up
                        setPopupTrigger(true);
                        //map asset intents to readable string
                        var readable_asset_intent = asset_intent.map((asset) => {
                            return asset[1] + " " + asset[0]
                        })
                        setPopupMsg(<div>Deposit of {readable_asset_intent} successful</div>);
                        setPopupStatus("Success");   
                        //Update Position data
                        // fetch_update_positionData();
                    });

                    //Clear intents
                    setassetIntent([])
                } catch (error){
                    ////Error message
                    const e = error as { message: string }
                    console.log(e.message)
                    ///Format Pop up
                    setPopupTrigger(true);
                    setPopupMsg(<div>{e.message}</div>);
                    setPopupStatus("Deposit Error");
                }
               break;
            }
            case "withdraw":{
                if (asset_intent.length === 0){
                    asset_intent = [[currentAsset, amount ?? 0]];
                }                
                ///parse assets into coin amounts
                var assets = getassetsfromassetIntents(asset_intent);
                
                try {
                    ////Execute Withdraw////
                    await cdp_client?.withdraw({
                        assets: assets,
                        positionId: positionID,
                    },
                    "auto").then((res) => {       
                        console.log(res?.events.toString())   
                        //map asset intents to readable string
                        let readable_asset_intent = asset_intent.map((asset) => {
                            return asset[1] + " " + asset[0]
                        })
                        //format pop up
                        setPopupTrigger(true);
                        setPopupMsg(<div>Withdrawal of {readable_asset_intent} successful</div>);
                        setPopupStatus("Success");              
                        //Update Position data
                        // fetch_update_positionData();
                    })

                    //Clear intents
                    setassetIntent([])
                } catch (error){
                    ////Error message
                    const e = error as { message: string }
                    console.log(e.message)
                    ///Format Pop up
                    setPopupTrigger(true);
                    setPopupMsg(<div>{e.message}</div>);
                    setPopupStatus("Withdrawal Error");
                } 
                break;
            }
            case "mint": {                
                try {
                    ///Execute the Mint
                    await cdp_client?.increaseDebt({
                        positionId: positionID,
                        amount: ((amount ?? 0) * 1_000_000).toString(),
                    }, "auto", undefined).then((res) => {           
                        console.log(res?.events.toString())             
                        //Update mint amount
                        setdebtAmount(+debtAmount + +((amount ?? 0) * 1_000_000));
                        setsliderValue((+debtAmount + +((amount ?? 0) * 1_000_000))/1000000);
                        //format pop up
                        setPopupTrigger(true);
                        setPopupMsg(<div>Mint of {(amount ?? 0)} CDT into your wallet successful. Be aware that now that you've minted, you can't withdraw collateral that would push your LTV past the yellow line & you'll be liquidated down to said line if you reach the red. Also, you can't pay below minimum debt so if you've minted at the minimum you'll need to repay in full + interest.</div>);
                        setPopupStatus("Success");
                    })
                    
                } catch (error){
                    ////Error message
                    const e = error as { message: string }
                    console.log(e.message)
                    ///Format Pop up
                    setPopupTrigger(true);
                    setPopupMsg(<div>{e.message}</div>);
                    setPopupStatus("Mint Error");
                }
                
                break;
            } 
            case "repay": {
                try {
                    console.log((amount??0) * 1_000_000)
                    var res = await cdp_client?.repay({
                        positionId: positionID,
                    }, "auto", undefined, coins((amount ?? 0) * 1_000_000, denoms.cdt))
                    .then((res) => {           
                        console.log(res?.events.toString())
                        //Update mint amount
                        setdebtAmount(+debtAmount - +(amount ?? 0));
                        setsliderValue((+debtAmount - +(amount ?? 0))/1000000);
                        //format pop up
                        setPopupTrigger(true);
                        setPopupMsg(<div>Repayment of {(amount ?? 0)} CDT successful</div>);
                        setPopupStatus("Success");
                    })
                    
                } catch (error){
                    ////Error message
                    const e = error as { message: string }
                    console.log(e.message)
                    ///Format Pop up
                    setPopupTrigger(true);
                    setPopupMsg(<div>{e.message}</div>);
                    setPopupStatus("Repay Error");
                }
                break;
            }
            case "redemptions": {
                try {                    
                    ///Execute the contract
                    await cdp_client?.editRedeemability(
                    {
                        positionIds: [positionID],
                        maxLoanRepayment: loanUsage ?? undefined,
                        premium: premium ?? undefined,
                        redeemable: redeemability ?? undefined,
                        restrictedCollateralAssets: restrictedAssets.assets ?? undefined,
                    }, "auto", undefined).then(async (res) => {
                        console.log(res?.events.toString())
                        //format pop up
                        setPopupTrigger(true);
                        setPopupMsg(<div>Redemption settings updated successfully</div>);
                        setPopupStatus("Success");
                    })

                } catch (error){
                    ////Error message
                    const e = error as { message: string }
                    console.log(e.message)
                    ///Format Pop up
                    setPopupTrigger(true);
                    setPopupMsg(<div>{e.message}</div>);
                    setPopupStatus("Edit Redemption Info Error");
                }
            }
        }

    };
    // const handleassetIntent = () => {
    //     if (amount !== undefined && amount > 0){
    //         setassetIntent(prevState => [
    //             ...prevState,
    //             [currentAsset, amount]
    //         ]);
    //     }
    // };
    //we add decimals to the asset amounts
    const getcoinsfromassetIntents = (intents: [string, number][]) => {
        var workingIntents: Coin[] = [];
        intents.map((intent) => {
            switch (intent[0]){
                case "OSMO": {
                    workingIntents.push(coin(intent[1] * 1_000_000, denoms.osmo))
                    break;
                }
                case "ATOM": {
                    workingIntents.push(coin(intent[1] * 1_000_000, denoms.atom))
                    break;
                }
                case "axlUSDC": {
                    workingIntents.push(coin(intent[1] * 1_000_000, denoms.axlUSDC))
                    break;
                }
                case "ATOM-OSMO LP": { //No normalization bc we are excepting 18 decimal
                    workingIntents.push(coin(intent[1].toString(), denoms.atomosmo_pool))
                    break;
                }
                case "OSMO-axlUSDC LP": { //No normalization bc we are excepting 18 decimal
                    workingIntents.push(coin(intent[1].toString(), denoms.osmousdc_pool))
                    break;
                }
            }
        })
        return workingIntents
    };
    const getassetsfromassetIntents = (intents: [string, number][]) => {
        var workingIntents: Asset[] = [];
        intents.map((intent) => {
            switch (intent[0]){
                case "OSMO": {
                    workingIntents.push({
                        amount: (intent[1]* 1_000_000).toString(),
                        //@ts-ignore
                        info: {native_token :{
                            //@ts-ignore
                            denom: denoms.osmo,
                        }}
                    })
                    break;
                }
                case "ATOM": {
                    workingIntents.push({
                        amount: (intent[1]* 1_000_000).toString(),
                        //@ts-ignore
                        info: {native_token :{
                            //@ts-ignore
                            denom: denoms.atom,
                        }}
                    })
                    break;
                }
                case "axlUSDC": {
                    workingIntents.push({
                        amount: (intent[1]* 1_000_000).toString(),
                        //@ts-ignore
                        info: {native_token :{
                            //@ts-ignore
                            denom: denoms.axlUSDC,
                        }}
                    })
                    break;
                }
                case "ATOM-OSMO LP": { //18 decimal instead of 6
                    workingIntents.push({
                        amount: (intent[1]).toString(),
                        //@ts-ignore
                        info: {native_token :{
                            //@ts-ignore
                            denom: denoms.atomosmo_pool,
                        }}
                    })
                    break;
                }
                case "OSMO-axlUSDC LP": { //18 decimal instead of 6
                    workingIntents.push({
                        amount: (intent[1]).toString(),
                        //@ts-ignore
                        info: {native_token :{
                            //@ts-ignore
                            denom: denoms.osmousdc_pool,
                        }}
                    })
                    break;
                }
            }
        })
        return workingIntents
    };
      
   const onTFMTextClick = () => {
        window.open(
        "https://tfm.com/ibc"
        );
   };  
   const onSquidTextClick = () => {
        window.open(
        "https://app.squidrouter.com/"
        );
   };

   function getTVL() {
    return(
        (osmoQTY * +prices.osmo) + (atomQTY * +prices.atom) + (axlusdcQTY * +prices.axlUSDC) 
        + (atomosmo_poolQTY * +prices.atomosmo_pool) + (osmousdc_poolQTY * +prices.osmousdc_pool)
    )
   }

    //getuserPosition info && set State
    useEffect(() => {
        if (address) {
            console.log("address: ", address)
            //setAddress
            setAddress(address as string)
        } else {        
            console.log("address: ", address)
        }
    })

  return (
    <div className="positions">
      <div>
        <div className="vault-page">
          <div className="vault-subframe">
            <div className="debt-visual">
              <div className="infobox-icon" />
              <div className="max-ltv">
                <div className="liq-value">${(((debtAmount/1_000000)* creditPrice) / (maxLTV / 100)).toFixed(2)}</div>
                <div className="cdp-div2">{maxLTV.toFixed(0)}%</div>
                <div className="max-ltv-child" />
              </div>
              <div className="max-borrow-ltv" style={{top: 75 + (335 * ((maxLTV-brwLTV)/maxLTV))}}>
                <div className="cdp-div3" >{brwLTV.toFixed(2)}%</div>
                <div className="max-borrow-ltv-child" />
              </div>
              <div className="debt-visual-child" />
              <div className="debt-visual-item" style={{top: 465 - (363 * ((((debtAmount/1_000000)* creditPrice)/(getTVL()+1)) / (maxLTV/100))), height: (340 * (((debtAmount/1_000000)* creditPrice)/(getTVL()+1)) / (maxLTV/100))}}/>
              <div className="debt-visual-label" style={{top: 445 - (359 * ((((debtAmount/1_000000)* creditPrice)/(getTVL()+1)) / (maxLTV/100)))}}>{(debtAmount/1000000).toString()} CDT</div>
              <input className="cdt-amount" style={{top: 100 + (335 * ((maxLTV-brwLTV)/maxLTV)), height: 445 - (100 + (335 * ((maxLTV-brwLTV)/maxLTV)))}} 
                name="amount" type="range" min="0" max={(getTVL()*(brwLTV/100))/Math.max(creditPrice, 1)} value={sliderValue} orient="vertical" onChange={({ target: { value: radius } }) => {
                if ((debtAmount/1000000) - parseInt(radius) > (walletCDT/1000000)){
                    setsliderValue((debtAmount - walletCDT)/1000000);

                    //Bc we know this is a repay (less than current debt), set amount to Wallet CDT
                    setAmount((walletCDT/1000000));
                    setcurrentfunctionLabel("repay");
                } else {
                    setsliderValue(parseInt(radius));

                    if (parseInt(radius) > (debtAmount/1000000)){
                        //Bc we know this is a mint (more than current debt), set amount to radius - debt amount. Radius at 114 -100 debt = 14 new mint
                        setAmount(parseInt((parseInt(radius) - (debtAmount/1000000)).toFixed(0)));
                        setcurrentfunctionLabel("mint");
                    } else if (parseInt(radius) === 0){
                        //Repay it all
                        setAmount((debtAmount/1000000));
                        setcurrentfunctionLabel("repay");
                    } else {
                        //Bc we know this is a repay (less than current debt), set amount to radius
                        setAmount(parseFloat(((debtAmount/1000000) - parseInt(radius)).toFixed(6)));
                        setcurrentfunctionLabel("repay");
                    }
                }
              }}/>
              <div className={sliderValue > (debtAmount/1000000) ? "green range-label" : sliderValue < (debtAmount/1000000) ? "red range-label" : "neutral range-label"} 
               style={{top: -(sliderValue * 1.8) + (407) + (335 * ((maxLTV-brwLTV)/maxLTV))}}>
                {(sliderValue - (debtAmount/1000000)) > 0 ? "+" : null}{(sliderValue - (debtAmount/1000000)).toFixed(1)}
              </div>
              <div className="cost-4">{cost > 0 ? "+" : null}{cost.toFixed(4)}%/yr</div>              
              <div className="position-stats">
              <div className="infobox-icon2" />
              <div className={currentfunctionLabel !== "repay" ? "low-opacity repay-button" : "repay-button"} onClick={handleExecution}>                
                  <div className="repay" onClick={handleExecution}>REPAY</div>
              </div>
              <div className={currentfunctionLabel !== "mint" ? "low-opacity mint-button" : "mint-button"} onClick={handleExecution}>
                  <div className="mint" onClick={handleExecution}>MINT</div>                
              </div>
              <Image className="cdt-logo-icon-cdp" width={45} height={45} alt="" src="/images/CDT.svg" />
              <div className="position-visual-words"><span className="slider-desc">Slider up:</span> Mint CDT using the value of your collateralized Bundle</div>
              <div className="position-visual-words-btmright"><span className="slider-desc">Slider down:</span> Repay your debt using the CDT in your wallet</div>
              </div>
            </div>
            <div className="asset-info">
              <div className="infobox-icon3"/>
              <div className="asset-info-child" />
              <div className="asset-info-item" />
              <div className="asset-info-inner" />
              <div className="line-div" />
              <div className="asset-info-child1" />
              <div className="asset-info-child2" />
              <div className="asset-info-child3" />
              <div className="asset">Asset</div>
              <div className="qty">Quantity</div>
              <div className="value">Value</div>
              <div>
                <Image className={osmoQTY > 0 ? "osmo-logo-icon" : "low-opacity osmo-logo-icon" } width={45} height={45} alt="" src="images/osmo.svg" onClick={handleOSMOClick}/>
                <div className={"osmo-qty"} onClick={()=>handleOSMOqtyClick(currentfunctionLabel)}>{osmoQTY === 0 ? "Add" : osmoQTY > 1000 ? (osmoQTY/1000).toFixed(2)+"k" : osmoQTY}</div>
                <div className={osmoQTY > 0 ?  "cdp-div5" : "low-opacity cdp-div5"}>${ (osmoQTY * +prices.osmo) > 1000 ? ((osmoQTY * +prices.osmo)/1000).toFixed(2)+"k" : (osmoQTY * +prices.osmo).toFixed(2)}</div>
              </div>              
              <div>
                <Image className={atomQTY > 0 ? "atom-logo-icon" : "low-opacity atom-logo-icon"} width={45} height={45} alt="" src="images/atom.svg" onClick={handleATOMClick} />
                <div className={"atom-qty"} onClick={()=>handleATOMqtyClick(currentfunctionLabel)}>{atomQTY === 0 ? "Add" : atomQTY > 1000 ? (atomQTY/1000).toFixed(2)+"k" : atomQTY}</div>
                <div className={atomQTY > 0 ?  "cdp-div7" : "low-opacity cdp-div7"}>${(atomQTY * +prices.atom) > 1000 ? ((atomQTY * +prices.atom)/1000).toFixed(2)+"k" : (atomQTY * +prices.atom).toFixed(2)}</div>
              </div>
              <div>
                <Image className={axlusdcQTY > 0 ? "axlusdc-logo-icon" : "low-opacity axlusdc-logo-icon"} width={45} height={45} alt="" src="images/usdc.svg" onClick={handleaxlUSDCClick} />
                <div className={"axlUSDC-qty"} onClick={()=>handleaxlUSDCqtyClick(currentfunctionLabel)}>{axlusdcQTY === 0 ? "Add" : axlusdcQTY > 1000 ? (axlusdcQTY/1000).toFixed(2)+"k" : axlusdcQTY}</div>
                <div className={axlusdcQTY > 0 ?  "cdp-div9" : "low-opacity cdp-div9"}>${(axlusdcQTY * +prices.axlUSDC) > 1000 ? ((axlusdcQTY * +prices.axlUSDC)/1000).toFixed(2)+"k" : (axlusdcQTY * +prices.axlUSDC).toFixed(2)}</div>
              </div>
              <div style={{opacity:0}}>
                <Image className={atomosmo_poolQTY > 0 ?" atomosmopool-atom-icon" : "low-opacity atomosmopool-osmo-icon"} width={45} height={45} alt="" src="images/atom.svg"  onClick={(handleatomosmo_poolClick)}/>
                <Image className={atomosmo_poolQTY > 0 ?" atomosmopool-osmo-icon" : "low-opacity atomosmopool-osmo-icon"} width={45} height={45} alt="" src="images/osmo.svg"  onClick={(handleatomosmo_poolClick)}/>
                {/* <div className={"atomosmopool-qty"} onClick={()=>handleatomosmo_poolqtyClick(currentfunctionLabel)}>{getReadableLPQTY(atomosmo_poolQTY)}</div> */}
                <div className={atomosmo_poolQTY > 0 ?  "cdp-div11" : "low-opacity cdp-div11"}>${(atomosmo_poolQTY * +prices.atomosmo_pool).toFixed(2)}</div>
              </div>
              <div style={{opacity:0}}>
                <Image className={osmousdc_poolQTY > 0 ? " osmousdcpool-osmo-icon": "low-opacity osmousdcpool-osmo-icon"} width={45} height={45} alt="" src="images/osmo.svg"  onClick={(handleosmousdc_poolClick)}/>
                <Image className={osmousdc_poolQTY > 0 ? " osmousdcpool-usdc-icon": "low-opacity osmousdcpool-osmo-icon"} width={45} height={45} alt="" src="images/usdc.svg"  onClick={(handleosmousdc_poolClick)}/>
                {/* <div className={"osmousdcpool-qty"} onClick={()=>handleosmousdc_poolqtyClick(currentfunctionLabel)}>{getReadableLPQTY(osmousdc_poolQTY)}</div> */}
                <div className={osmousdc_poolQTY > 0 ?  "cdp-div13" : "low-opacity cdp-div13"}>${(osmousdc_poolQTY * +prices.osmousdc_pool).toFixed(2)}</div>
              </div>
            </div>
            <div className="tvl-500">TVL: ${getTVL().toFixed(2)}</div>
          </div>
          <div className="controller-item">
            <div className="controller-border"/>
            <div className="controller-frame"/>
            <div className="controller-label"/>
            <div className="controller-screen-blank"> 
                <div className="starting-screen">
                    { currentfunctionLabel === "" ? 
                    <>Depositing requires assets on Osmosis. Bridge/swap to using:&nbsp;
                    <a className="nowrap" style={{textDecoration: "underline"}} onClick={onTFMTextClick}>TFM</a> for IBC or <a className="nowrap" style={{textDecoration: "underline"}} onClick={onSquidTextClick}>Squid</a>
                    &nbsp;if outside IBC-connected chains.</>
                    : null}
                </div>
            </div>
            <div className="controller" onClick={currentfunctionLabel === "redemptions" ? handleredeeminfoClick : handleredeemScreen}>Collateral</div>
            <div className={getTVL()*(maxLTV/100) < (debtAmount/1000000)*creditPrice ? "user-redemption-button red-border" : redeemButton} onClick={handleExecution}>
                <div className="spacing-btm">{currentfunctionLabel === "deposit" ? "Deposit" : currentfunctionLabel === "withdraw" ? "Withdraw" : currentfunctionLabel === "redemptions" ? "Update" : "<-----" }</div>
            </div>    
            <div className={redeemScreen}>
                <form>            
                    <input className="mint-button-icon2" style={{backgroundColor:"#454444"}} name="premium" value={premium} type="number" onChange={handlesetPremium}/>
                    <div className={posClick} onClick={handleposClick}/>
                    <div className={negClick} onClick={handlenegClick}/>
                    <div className="premium-label">Premium</div>
                    <input className="mint-button-icon5" style={{backgroundColor:"#454444"}} name="loan-usage" defaultValue={0.01} value={loanUsage} type="number" onChange={handlesetloanUsage}/>
                    <div className="loan-usage">% Loan Usage</div>
                </form>
                <div className="edit-redeemability">Redeemability Status</div>
                <div className="click-assets-on">
                {restrictedAssets.sentence}
                </div>
            </div>
            <div className={redeemInfoScreen}>
                    <div className="user-redemptions">
                        <div>Premium: {redemptionRes?.premium_infos[0].premium }</div>
                        { redemptionRes !== undefined ? <div>Left to Redeem: {parseInt(redemptionRes?.premium_infos[0].users_of_premium[0].position_infos[0].remaining_loan_repayment)/ 1_000_000}</div> : null}
                        <div>Restricted Assets: {redemptionRes?.premium_infos[0].users_of_premium[0].position_infos[0].restricted_collateral_assets}</div>
                    </div>
            </div>
            <div className={depositwithdrawScreen}>
                <div className={currentfunctionLabel === "deposit" ? "cdp-deposit-label bold" : "cdp-deposit-label low-opacity"} onClick={handledepositClick}>Deposit</div>
                <div className="slash">/</div>
                <div className={currentfunctionLabel === "withdraw" ? "cdp-withdraw-label bold" : "cdp-withdraw-label low-opacity"} onClick={handlewithdrawClick}>Withdraw</div>
                <form>
                    { maxLPamount !== BigInt(0) ? (<><div className="max-amount-label" onClick={handlesetAmount}>max: {maxLPamount.toString()}</div></>) : null}            
                    <label className="amount-label">{currentAsset} amount:</label>     
                    <input className="amount" style={{backgroundColor:"#454444"}} name="amount" value={currentfunctionLabel !== "deposit" && currentfunctionLabel !== "withdraw" ? 0 : amount} type="number" onChange={handlesetAmountInput}/>
                </form>
            </div>
          </div>
        </div>

        <Image className="pie-chart-icon1" width={48} height={48} alt="" src="images/pie_chart.svg" />          
        <div className="vaults1">VAULTS</div>
      </div>
      <Popup trigger={popupTrigger} setTrigger={setPopupTrigger} msgStatus={popupStatus} errorMsg={popupMsg}/>
    </div>
  );
};

export default Positions;
